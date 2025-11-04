uniform sampler2D u_grassTexture;
uniform sampler2D u_rockTexture;
uniform float u_textureScale;

// Slope-based texture blending
uniform float u_slopeThreshold;
uniform float u_slopeBlendRange;

uniform vec3 u_sunPosition;
uniform vec3 u_ambientLight;
uniform float u_ambientIntensity;
uniform vec3 u_sunColor;
uniform float u_sunIntensity;

varying vec3 v_worldPosition;
varying vec3 v_normal;
varying vec3 v_viewPosition;

void main() {
    // Normalize the normal vector
    vec3 normal = normalize(v_normal);

    // Create texture coordinates from world position for consistent tiling
    // Use XZ plane since the plane is rotated (Y is up after rotation)
    vec2 texCoord = v_worldPosition.xz * u_textureScale;

    // Sample textures
    vec3 grass = texture2D(u_grassTexture, texCoord).rgb;
    vec3 rock = texture2D(u_rockTexture, texCoord).rgb;

    // Calculate slope (dot product with up vector)
    // 1.0 = flat surface, 0.0 = vertical surface
    float slope = dot(normal, vec3(0.0, 1.0, 0.0));

    // Blend between grass and rock based on slope
    // Below threshold = rock, above threshold = grass
    // Use smoothstep for smooth transition in the blend range
    float grassFactor = smoothstep(
        u_slopeThreshold - u_slopeBlendRange,
        u_slopeThreshold + u_slopeBlendRange,
        slope
    );

    vec3 terrainColor = mix(rock, grass, grassFactor);

    //========================================================== LIGHTING ====//

    // Ambient lighting
    vec3 ambient = u_ambientLight * u_ambientIntensity;

    // Directional sun lighting
    vec3 lightDir = normalize(u_sunPosition - v_worldPosition);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = u_sunColor * diff * u_sunIntensity;

    // Specular highlight (subtle)
    vec3 viewDir = normalize(v_viewPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = u_sunColor * spec * 0.3;

    // Combine lighting with terrain color
    vec3 finalColor = terrainColor * (ambient + diffuse) + specular;

    // Apply basic fog for depth perception
    float fogDistance = length(v_viewPosition);
    float fogFactor = smoothstep(500.0, 1500.0, fogDistance);
    vec3 fogColor = vec3(0.63, 0.64, 0.65); // Match scene background
    finalColor = mix(finalColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}

