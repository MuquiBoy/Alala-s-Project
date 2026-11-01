import ctypes as c
import os
import argparse
from pathlib import Path

"""Convert the supplied SketchUp training arena to a centred, metre-scale OBJ.

Requires a local SketchUp installation with SketchUpAPI.dll. Runtime play uses
only the checked-in OBJ; this script is for regenerating it from the source SKP.
"""
project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--sdk', type=Path, default=Path(r'C:\Program Files\SketchUp\SketchUp 2021'))
parser.add_argument('--source', type=Path, default=project / 'public/models/arenas/training-02/source/arena 3d.skp')
parser.add_argument('--output', type=Path, default=project / 'public/models/arenas/training-02/arena-v2.obj')
args = parser.parse_args()
sdk_dir = args.sdk
os.add_dll_directory(str(sdk_dir))
api = c.CDLL(str(sdk_dir / 'SketchUpAPI.dll'))
Ref = c.c_void_p

def fn(name, *arguments, result=c.c_int):
    f = getattr(api, name)
    f.argtypes = list(arguments)
    f.restype = result
    return f

initialize = fn('SUInitialize', result=None)
terminate = fn('SUTerminate', result=None)
load = fn('SUModelCreateFromFileWithStatus', c.POINTER(Ref), c.c_char_p, c.POINTER(c.c_int))
release = fn('SUModelRelease', c.POINTER(Ref))
model_entities = fn('SUModelGetEntities', Ref, c.POINTER(Ref))
count_faces = fn('SUEntitiesGetNumFaces', Ref, c.POINTER(c.c_size_t))
get_faces = fn('SUEntitiesGetFaces', Ref, c.c_size_t, c.POINTER(Ref), c.POINTER(c.c_size_t))
count_groups = fn('SUEntitiesGetNumGroups', Ref, c.POINTER(c.c_size_t))
get_groups = fn('SUEntitiesGetGroups', Ref, c.c_size_t, c.POINTER(Ref), c.POINTER(c.c_size_t))
group_entities = fn('SUGroupGetEntities', Ref, c.POINTER(Ref))
class Transformation(c.Structure):
    _fields_ = [('values', c.c_double * 16)]
group_transform = fn('SUGroupGetTransform', Ref, c.POINTER(Transformation))
mesh_create = fn('SUMeshHelperCreate', c.POINTER(Ref), Ref)
mesh_release = fn('SUMeshHelperRelease', c.POINTER(Ref))
mesh_num_vertices = fn('SUMeshHelperGetNumVertices', Ref, c.POINTER(c.c_size_t))
mesh_num_triangles = fn('SUMeshHelperGetNumTriangles', Ref, c.POINTER(c.c_size_t))
class Point(c.Structure):
    _fields_ = [('x', c.c_double), ('y', c.c_double), ('z', c.c_double)]
mesh_vertices = fn('SUMeshHelperGetVertices', Ref, c.c_size_t, c.POINTER(Point), c.POINTER(c.c_size_t))
mesh_indices = fn('SUMeshHelperGetVertexIndices', Ref, c.c_size_t, c.POINTER(c.c_size_t), c.POINTER(c.c_size_t))

def check(code, label):
    if code != 0:
        raise RuntimeError(f'{label}: SDK error {code}')

def apply(point, matrices):
    x,y,z = point.x,point.y,point.z
    for mat in reversed(matrices):
        m = mat.values
        x,y,z = (m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14])
    return (x*0.0254,z*0.0254,-y*0.0254)

def collect(entities, matrices, vertices, triangles):
    count = c.c_size_t()
    check(count_faces(entities,c.byref(count)),'count faces')
    if count.value:
        faces = (Ref*count.value)()
        check(get_faces(entities,count.value,faces,c.byref(count)),'get faces')
        for face in faces:
            mesh = Ref()
            check(mesh_create(c.byref(mesh),face),'mesh create')
            n = c.c_size_t(); t = c.c_size_t()
            check(mesh_num_vertices(mesh,c.byref(n)),'mesh num vertices')
            check(mesh_num_triangles(mesh,c.byref(t)),'mesh num triangles')
            points = (Point*n.value)(); indices = (c.c_size_t*(t.value*3))()
            check(mesh_vertices(mesh,n.value,points,c.byref(n)),'mesh vertices')
            index_count = c.c_size_t()
            check(mesh_indices(mesh,t.value*3,indices,c.byref(index_count)),'mesh indices')
            base = len(vertices)
            vertices.extend(apply(p,matrices) for p in points)
            triangles.extend(tuple(base+indices[i+j] for j in range(3)) for i in range(0,index_count.value,3))
            check(mesh_release(c.byref(mesh)),'mesh release')
    check(count_groups(entities,c.byref(count)),'count groups')
    if count.value:
        groups = (Ref*count.value)()
        check(get_groups(entities,count.value,groups,c.byref(count)),'get groups')
        for group in groups:
            mat = Transformation(); child=Ref()
            check(group_transform(group,c.byref(mat)),'group transform')
            check(group_entities(group,c.byref(child)),'group entities')
            collect(child,matrices+[mat],vertices,triangles)

initialize()
model = Ref(); status=c.c_int()
check(load(c.byref(model),str(args.source).encode('utf-8'),c.byref(status)),'load')
try:
    root=Ref(); check(model_entities(model,c.byref(root)),'root')
    vertices=[]; triangles=[]
    collect(root,[],vertices,triangles)
    if not vertices:
        raise RuntimeError('El SKP no contiene caras exportables.')
    centre_x = (min(p[0] for p in vertices) + max(p[0] for p in vertices)) / 2
    centre_z = (min(p[2] for p in vertices) + max(p[2] for p in vertices)) / 2
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', encoding='utf-8', newline='\n') as output:
        output.write('# ALALA\'S CHILDREN training arena; metres, Y up, centred X/Z\n')
        for x, y, z in vertices:
            output.write(f'v {x-centre_x:.8f} {y:.8f} {z-centre_z:.8f}\n')
        for a, b, d in triangles:
            output.write(f'f {a+1} {b+1} {d+1}\n')
    print(f'{args.output}: {len(vertices)} vertices, {len(triangles)} triangles (status {status.value})')
finally:
    check(release(c.byref(model)),'release')
    terminate()
