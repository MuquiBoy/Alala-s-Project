extends SceneTree

var actor: CharacterBody3D
var targets: Array[CharacterBody3D] = []
var samples: Array[int] = []
var ticks := 0
var world: Node3D

func _initialize() -> void:
	call_deferred("build")

func static_box(size: Vector3, at: Vector3) -> void:
	var body := StaticBody3D.new()
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	world.add_child(body)
	body.position = at

func character(at: Vector3, radius: float) -> CharacterBody3D:
	var body := CharacterBody3D.new()
	var collision := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = radius
	shape.height = 1.3
	collision.shape = shape
	body.add_child(collision)
	world.add_child(body)
	body.position = at
	return body

func build() -> void:
	Engine.physics_ticks_per_second = 60
	world = Node3D.new()
	root.add_child(world)
	static_box(Vector3(25, 1, 25), Vector3(0, -0.5, 0))
	static_box(Vector3(26, 2.8, 0.5), Vector3(0, 1.4, -12.75))
	static_box(Vector3(26, 2.8, 0.5), Vector3(0, 1.4, 12.75))
	static_box(Vector3(0.5, 2.8, 25), Vector3(-12.75, 1.4, 0))
	static_box(Vector3(0.5, 2.8, 25), Vector3(12.75, 1.4, 0))
	static_box(Vector3(11, 4, 1), Vector3(0, 2, 0))
	var mesh := MultiMeshInstance3D.new()
	mesh.multimesh = MultiMesh.new()
	mesh.multimesh.transform_format = MultiMesh.TRANSFORM_3D
	mesh.multimesh.mesh = BoxMesh.new()
	mesh.multimesh.instance_count = 625
	for index in range(625):
		mesh.multimesh.set_instance_transform(index, Transform3D(Basis(), Vector3(index % 25 - 12, -0.5, floori(index / 25.0) - 12)))
	world.add_child(mesh)
	actor = character(Vector3(0, 0.67, 8.5), 0.52)
	for at in [Vector3(-2.8, 0.67, 4.5), Vector3(2.8, 0.67, 7), Vector3(-2.8, 0.67, -3.5)]:
		targets.append(character(at, 0.42))

func _physics_process(_delta: float) -> bool:
	if actor == null:
		return false
	var started := Time.get_ticks_usec()
	for target in targets:
		target.velocity = Vector3(0, -0.5, 0)
		target.move_and_slide()
	actor.velocity = Vector3(0, -0.5, -2.8)
	actor.move_and_slide()
	var elapsed := Time.get_ticks_usec() - started
	if ticks >= 60:
		samples.append(elapsed)
	ticks += 1
	if ticks % 180 == 0:
		actor.position = Vector3(0, 0.67, 8.5)
	if ticks >= 660:
		samples.sort()
		var total := 0.0
		for value in samples:
			total += value
		var report := {"engine": Engine.get_version_info().string, "mode": "headless", "static_colliders": 6, "actors": 4, "floor_instances": 625, "ticks": samples.size(), "mean_us": total / samples.size(), "p50_us": samples[300], "p95_us": samples[570], "scope": "four CharacterBody3D.move_and_slide calls; global physics step is outside this timer", "gpu_rendering_measured": false, "voice_integration_measured": false, "physics_backend": ProjectSettings.get_setting("physics/3d/physics_engine")}
		var file := FileAccess.open("res://result.json", FileAccess.WRITE)
		file.store_string(JSON.stringify(report, "  ") + "\n")
		print(JSON.stringify(report))
		quit()
	return false
