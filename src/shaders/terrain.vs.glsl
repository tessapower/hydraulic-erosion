varying vec3 vViewPosition;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPosition.xyz;

    v_normal = normalize(normalMatrix * normal);
    v_position = (mvPosition).xyz;
    gl_Position = projectionMatrix * mvPosition;
}
