"""Create the standalone adapter preview from its existing Blender source.

Run with Blender --background --python scripts/restore-adapter-free-pins.py.
The original files and the assembled dock are deliberately retained. Only the
eight pin parts move from the assembly's compressed pose to stored free_location.
"""
from pathlib import Path
import hashlib
import json

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/xteink-x3/accessories/x3-type-c-adapter'
SOURCE = OUT / 'X3_Type_C_Adapter.blend'

def mesh_fingerprint(obj):
    data = {
        'matrix': [list(row) for row in obj.matrix_world],
        'vertices': [list(v.co) for v in obj.data.vertices],
        'polygons': [list(p.vertices) for p in obj.data.polygons],
    }
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
pins = [o for o in meshes if 'free_location' in o]
assert len(meshes) == 15 and len(pins) == 8
fixed = {o.name: mesh_fingerprint(o) for o in meshes if o not in pins}
step = next(o for o in meshes if o.name.startswith('REFERENCE | Waisted contact step'))
tips = sorted((o for o in pins if 'Rounded pin tip' in o.name), key=lambda o: o.name)
outward = (tips[0].matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
face = max(outward.dot(step.matrix_world @ v.co) for v in step.data.vertices)

def extension(tip):
    return (max(outward.dot(tip.matrix_world @ v.co) for v in tip.data.vertices) - face) * 1000

before = [extension(o) for o in tips]
shifts = []
for pin in pins:
    free = Vector(pin['free_location'])
    shifts.append((free - pin.location).length * 1000)
    pin.animation_data_clear()
    pin.location = free
bpy.context.view_layer.update()
after = [extension(o) for o in tips]
assert all(abs(x - 0.109) < 0.002 for x in before), before
assert all(abs(x - 0.5) < 0.002 for x in after), after
assert all(abs(x - 0.391) < 0.002 for x in shifts), shifts
assert fixed == {o.name: mesh_fingerprint(o) for o in meshes if o not in pins}
scene.frame_set(48)
assert all(abs(extension(o) - 0.5) < 0.002 for o in tips)
scene.frame_set(1)
scene.frame_end = 1
scene.timeline_markers.clear()
scene['adapter_display_state'] = 'Free pins; nominal 0.50 mm above black step face, not a measured pin height.'
scene['adapter_display_source'] = SOURCE.name
note = bpy.data.texts.get('STANDALONE_DISPLAY.md') or bpy.data.texts.new('STANDALONE_DISPLAY.md')
note.clear()
note.write('Standalone adapter: pin parts restored to their stored free_location.\n'
           'The 0.50 mm free extension is the original illustrative assumption, not a physical measurement.\n'
           'Assembly compression animation removed from this standalone copy only.\n'
           'Body, magnets, step, socket, and manufacturing STEP remain unchanged.\n'
           'Other embedded dock validation texts describe the original assembly, not this standalone display.\n')
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = step
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'X3_Type_C_Adapter_Free_Pins.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT / 'model-free-pins.glb'), export_format='GLB',
                          use_selection=True, export_apply=True, export_animations=False)
report = {
    'source': str(SOURCE.relative_to(ROOT)),
    'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'before_pin_extension_mm': before,
    'after_pin_extension_mm': after,
    'pin_part_translation_mm': shifts,
    'unchanged_meshes': fixed,
    'original_files_retained': ['model.glb', 'X3_Type_C_Adapter.blend', 'poster.png', 'X3_Type_C_Adapter.step'],
    'actual_pin_height_measured': False,
    'assembly_and_manufacturing_geometry_modified': False,
}
(ROOT / 'docs/adapter-free-pins-check.json').write_text(json.dumps(report, indent=2) + '\n')
scene.render.filepath = str(OUT / 'poster-free-pins.png')
scene.render.resolution_x = 700
scene.render.resolution_y = 560
scene.render.resolution_percentage = 100
bpy.ops.render.render(write_still=True)
print('FREE_PINS_VALIDATED', json.dumps({'before_mm': before, 'after_mm': after}))
