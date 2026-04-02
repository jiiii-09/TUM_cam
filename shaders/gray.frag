precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D u_tex0;

void main() {
    vec2 uv = vec2(1.0 - vTexCoord.x, 1.0 - vTexCoord.y);

    vec3 col = texture2D(u_tex0, uv).rgb;

    float gray = (col.r + col.g + col.b) / 3.0;

    gl_FragColor = vec4(vec3(gray), 1.0);
}