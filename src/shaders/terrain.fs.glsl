varying vec3 vViewPosition;

// Fog uniforms (Three.js provides these when fog: true)
#ifdef USE_FOG
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
#endif

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

    // Simple ambient occlusion based on slope, darkens the shadows on
    // steeper surfaces
    float slope = 1.0 - clamp(normal.y, 0.0, 1.0);
    float ao = mix(1.0, 0.7, pow(slope, 1.2));
    finalColor *= ao;

    gl_FragColor = vec4(finalColor, 1.0);

    // Manual fog calculation
    #ifdef USE_FOG
    float depth = length(vViewPosition);
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif
}
