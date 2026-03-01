# ComfyUI VNCCS Utils — GLB Fork

This is a fork of the excellent [ComfyUI_VNCCS_Utils](https://github.com/AHEKOT/ComfyUI_VNCCS) project by [AHEKOT](https://github.com/AHEKOT), extended to add GLB model support via the Boyo GLB Pose Studio node.

Full credit and thanks to the original VNCCS project team — the architecture, patterns, and frontend approach used in this fork are directly derived from their work, particularly the VNCCS Pose Studio node. Please consider supporting the original project:


**Fork repository:** https://github.com/DragonDiffusionbyBoyo/ComfyUI_Boyo_VNCCS_Utils_GLB

---
<a href="https://discord.com/invite/9Dacp4wvQw" target="_blank"><img src="https://img.shields.io/badge/Join%20the%20original%20VNCCS%20Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" style="height: 60px !important;"></a>

---

## What This Fork Adds

### Boyo GLB Pose Studio

A GLB model viewer and pose reference node for ComfyUI, built directly on top of the VNCCS Pose Studio architecture. Where the original Pose Studio works with MakeHuman meshes, this node accepts any `.glb` file — making it particularly useful for exporting custom posed characters from DAZ Studio via Blender with poses baked in.

The primary use case is generating pose reference images for ControlNet and LoRA training, using your own rigged character assets rather than being limited to the MakeHuman base mesh.

*   **GLB Loading**: Load any `.glb` file directly in the node widget
*   **Dynamic Skeleton Detection**: Automatically detects armatures in loaded models and generates bone rotation controls based on whatever bones are present
*   **Bone Rotation Controls**: Per-bone X/Y/Z sliders generated at load time from the model's actual armature
*   **Model Position Controls**: Translate the model in 3D space to frame up any section
*   **Interactive Viewport**: Left drag to rotate, right drag to pan, scroll to zoom
*   **Lighting Controls**: Ambient, directional, and point lights with colour and intensity controls
*   **Black Background Output**: Clean black background by default, ideal for ControlNet use
*   **1024×1024 Output**: Captures at 1024×1024 regardless of viewport size
*   **Natural Language Lighting Prompts**: Generates descriptive lighting prompts from your current light setup

The node follows the VNCCS Pose Studio architectural patterns exactly — Three.js loaded via ESM, Python backend handles only image decoding and tensor conversion, all rendering happens in the frontend widget.

---

## Original VNCCS Nodes

All original nodes from the VNCCS project are included in this fork unchanged. See the [original repository](https://github.com/AHEKOT/ComfyUI_VNCCS) for full documentation on these.

### VNCCS Visual Camera Control

An interactive node with a visual widget for controlling camera position, optimised for multi-angle LoRAs like **Qwen-Image-Edit-2511-Multiple-Angles**.

### VNCCS QWEN Detailer

A detailing node leveraging QWEN-Image-Edit2511 for region enhancement with smart cropping, vision-guided enhancement, and Poisson blending.

### VNCCS Model Manager & Selector

A model management system with HuggingFace and Civitai support, visual card UI, and one-click install/update.

### VNCCS BBox Extractor

Helper node for extracting and visualising bounding box crops from detection results.

### VNCCS Pose Studio

The original MakeHuman-based 3D posing environment with bone gizmos, undo/redo, dynamic body generator, multi-pose tabs, and tracing support. The Boyo GLB Pose Studio node in this fork is built on its foundations.

---

## Installation

1. Copy the `ComfyUI_Boyo_VNCCS_Utils_GLB` folder into your ComfyUI `custom_nodes` directory.
2. Restart ComfyUI.