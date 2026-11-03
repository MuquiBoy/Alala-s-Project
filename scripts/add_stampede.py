import bpy,math,os,sys,json
from mathutils import Vector,Quaternion
source,output=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=source)
rig=bpy.data.objects['Avatar01_Rig'];scene=bpy.context.scene
meshes=[o for o in bpy.data.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
counts={o.name:[len(o.data.vertices),len(o.data.polygons)] for o in meshes}
rig.animation_data.action=None
for p in rig.pose.bones:p.location=(0,0,0);p.rotation_quaternion=(1,0,0,0);p.scale=(1,1,1)
rig['head_yaw_deg']=0
act=bpy.data.actions.new('Run_Stampede');act.use_fake_user=True;rig.animation_data.action=act
scale=2.5/4.45119
legs=[('Rear_L',0,-1,1),('Front_L',.25,-1,-1),('Rear_R',.5,1,1),('Front_R',.75,1,-1)]
for f in range(1,20):
 t=(f-1)/18
 impact=0;sway=0
 for name,phase,sx,sy in legs:
  p=(t-phase)%1;u=p/.22
  # Continuous grounded sequence; stance travels backward at the reference speed.
  span=2.4*.78/scale
  if p<.22:
   ease=u*u*u*(10-15*u+6*u*u)
   tangent=span/.78*.22
   y=span/2+tangent*u-(span+tangent)*ease
   z=.25/scale*math.sin(math.pi*u)**2
  else:y=-span/2+span*(p-.22)/.78;z=0
  pb=rig.pose.bones['CTRL_Foot_'+name]
  pb.location=pb.bone.matrix_local.to_3x3().inverted()@Vector((0,y,z))
  pb.keyframe_insert('location',frame=f)
  since=(p-.22)%1
  impact+=math.exp(-since*30)*math.sin(min(1,since/.10)*math.pi)
  sway+=sx*math.sin(2*math.pi*p)*.012
 for name in ['Body','Head_Aim']:
  pb=rig.pose.bones[name];pb.location=pb.bone.matrix_local.to_3x3().inverted()@Vector((sway,0,-.07-.045*impact))
  pb.keyframe_insert('location',frame=f)
 pb=rig.pose.bones['Body'];rest=pb.bone.matrix_local.to_quaternion()
 pb.rotation_quaternion=rest.inverted()@Quaternion((1,0,0),math.radians(3))@rest;pb.keyframe_insert('rotation_quaternion',frame=f)
for layer in act.layers:
 for strip in layer.strips:
  for slot in act.slots:
   bag=strip.channelbag(slot,ensure=False)
   if bag:
    for curve in bag.fcurves:
     for k in curve.keyframe_points:k.interpolation='LINEAR'
act['reference_speed_mps']=4.;act['cycle_distance_m']=2.4
for o in bpy.context.selected_objects:o.select_set(False)
for o in meshes+[rig]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
scene.frame_start=1;scene.frame_end=19;scene.frame_set(1)
rig.scale=(scale,)*3;rig.rotation_euler.z=math.pi
bpy.context.view_layer.update()
bpy.ops.export_scene.gltf(filepath=os.path.splitext(output)[0]+'.glb',export_format='GLB',use_selection=True,export_animations=True,export_force_sampling=True,export_frame_range=False,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_anim_slide_to_zero=True,export_bake_animation=True,export_optimize_animation_size=False,export_def_bones=True,export_extras=True)
rig.scale=(1,1,1);rig.rotation_euler.z=0;scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=output)
assert counts=={o.name:[len(o.data.vertices),len(o.data.polygons)] for o in meshes}
print('STAMPede_READY',json.dumps({'topology':counts,'action':act.name,'cycle_seconds':.6,'mass_simulation':500}))
