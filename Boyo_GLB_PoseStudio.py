"""Boyo GLB Pose Studio - Load and pose GLB models.

Built following VNCCS Pose Studio patterns.
Frontend handles all GLB loading and rendering.
Backend just receives captured images and outputs them.
"""

import json
import base64
from io import BytesIO
import torch
import numpy as np
from PIL import Image


class Boyo_GLB_PoseStudio:
    """GLB Pose Studio - receives rendered images from frontend."""
    
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("images", "lighting_prompt")
    OUTPUT_IS_LIST = (True, True)
    FUNCTION = "generate"
    CATEGORY = "Boyo/glb"
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pose_data": ("STRING", {"multiline": True, "default": "{}"}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    @classmethod
    def IS_CHANGED(cls, pose_data: str = "{}", unique_id: str = None):
        """Force re-execution if data changes."""
        return pose_data
    
    def generate(self, pose_data: str = "{}", unique_id: str = None):
        """Generate output from frontend-captured images."""
        
        # Parse input data
        try:
            data = json.loads(pose_data) if pose_data else {}
        except (json.JSONDecodeError, TypeError):
            data = {}
            
        if not isinstance(data, dict):
            print(f"[Boyo GLB] Error: pose_data is not a dict")
            data = {}
        
        # Extract settings
        export_settings = data.get("export", {})
        output_mode = export_settings.get("output_mode", "LIST")
        grid_columns = export_settings.get("grid_columns", 2)
        bg_color = export_settings.get("bg_color", [0, 0, 0])
        
        # Get captured images from frontend
        captured_images = data.get("captured_images", [])
        lighting_prompts = data.get("lighting_prompts", [])
        
        if not captured_images:
            print("[Boyo GLB] No images captured from frontend")
            # Return placeholder
            placeholder = np.zeros((1024, 1024, 3), dtype=np.float32)
            return ([torch.from_numpy(placeholder).unsqueeze(0)], [""])
        
        # Decode base64 images
        rendered_images = []
        for b64_data in captured_images:
            if not b64_data:
                continue
            
            # Remove data URI header if present
            if "," in b64_data:
                b64_data = b64_data.split(",", 1)[1]
            
            try:
                img_data = base64.b64decode(b64_data)
                img = Image.open(BytesIO(img_data)).convert('RGB')
                rendered_images.append(img)
            except Exception as e:
                print(f"[Boyo GLB] Failed to decode image: {e}")
        
        if not rendered_images:
            print("[Boyo GLB] No valid images decoded")
            placeholder = np.zeros((1024, 1024, 3), dtype=np.float32)
            return ([torch.from_numpy(placeholder).unsqueeze(0)], [""])
        
        # Pad prompts to match image count
        while len(lighting_prompts) < len(rendered_images):
            lighting_prompts.append("")
        
        # Convert to tensors
        tensors = []
        for img in rendered_images:
            np_img = np.array(img).astype(np.float32) / 255.0
            tensors.append(torch.from_numpy(np_img))
        
        if output_mode == "LIST":
            # Return list of individual images
            tensor_list = [t.unsqueeze(0) for t in tensors]
            return (tensor_list, lighting_prompts)
        else:
            # GRID mode
            grid_img = self._make_grid(rendered_images, grid_columns, tuple(bg_color))
            np_grid = np.array(grid_img).astype(np.float32) / 255.0
            grid_tensor = torch.from_numpy(np_grid).unsqueeze(0)
            
            combined_prompt = lighting_prompts[0] if lighting_prompts else ""
            return ([grid_tensor], [combined_prompt])
    
    def _make_grid(self, images, columns, bg_color=(0, 0, 0)):
        """Combine images into a grid."""
        if not images:
            return Image.new('RGB', (1024, 1024), bg_color)
        
        n = len(images)
        cols = min(columns, n)
        rows = (n + cols - 1) // cols
        
        w, h = images[0].size
        grid = Image.new('RGB', (w * cols, h * rows), bg_color)
        
        for i, img in enumerate(images):
            row = i // cols
            col = i % cols
            grid.paste(img, (col * w, row * h))
        
        return grid


# Node registration
NODE_CLASS_MAPPINGS = {
    "Boyo_GLB_PoseStudio": Boyo_GLB_PoseStudio
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Boyo_GLB_PoseStudio": "Boyo GLB Pose Studio"
}
