varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec3 v_viewPosition;

void main() {
    // Transform normal to world space
    v_normal = normalize(normalMatrix * normal);

    // Calculate world position
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    v_worldPosition = worldPos.xyz;

    // Calculate view position for lighting
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    v_viewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
}
