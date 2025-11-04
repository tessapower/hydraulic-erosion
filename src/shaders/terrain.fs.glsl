uniform vec3 u_flatColor;
uniform vec3 u_steepColor;
uniform float u_steepness;
uniform vec3 u_lightDirection;
uniform vec3 u_lightColor;
uniform float u_lightStrength;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    // Choose color based on slope (Y component of normal)
    vec3 baseColor = v_normal.y < u_steepness ? u_steepColor : u_flatColor;

    // Phong lighting
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightDirection);
    vec3 viewDir = normalize(-v_position);
    vec3 reflectDir = reflect(-lightDir, normal);

    // Diffuse
    float diffuse = clamp(dot(normal, lightDir), 0.1, 0.9);

    // Ambient
    float ambient = 0.1;

    // Specular
    float specular = 0.05 * pow(max(dot(viewDir, reflectDir), 0.1), 64.0);

    // Combine
    vec3 lighting = u_lightColor * u_lightStrength * (diffuse + ambient + specular);
    vec3 finalColor = baseColor * lighting;

    gl_FragColor = vec4(finalColor, 1.0);
}
