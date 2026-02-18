import { useEffect, useRef, useState } from "react";

const vertexShader = `
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(3.0, 1.0)
  );
  let p = positions[vertexIndex];
  return vec4<f32>(p, 0.0, 1.0);
}
`;

const fragmentShader = `
struct Uniforms {
  time: f32,
  aspect: f32,
  width: f32,
  height: f32,
  pulse: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32
}

@group(0) @binding(0) var<uniform> u: Uniforms;

fn ringWave(p: vec2<f32>, t: f32) -> f32 {
  let r = length(p);
  let a = atan2(p.y, p.x);
  let wobble = sin(a * 7.0 + t * 1.4) * 0.05;
  let target = 0.42 + wobble + sin(t * 2.1) * 0.02;
  let edge = abs(r - target);
  return exp(-edge * 20.0);
}

fn energyField(p: vec2<f32>, t: f32) -> f32 {
  let r = length(p);
  let a = atan2(p.y, p.x);
  let streak = sin(a * 30.0 + t * 6.0 + r * 12.0);
  let glow = smoothstep(0.72, 0.05, r);
  return max(streak, 0.0) * glow;
}

@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
  let resolution = vec2<f32>(u.width, u.height);
  var uv = (fragCoord.xy / resolution) * 2.0 - vec2<f32>(1.0, 1.0);
  uv.x = uv.x * u.aspect;

  let t = u.time;
  let ring = ringWave(uv, t) + ringWave(uv * 1.25, t + 1.3) * 0.6;
  let field = energyField(uv, t) * 0.9;
  let drift = sin((uv.x + uv.y) * 3.0 + t * 0.9) * 0.08 + 0.12;

  let saffron = vec3<f32>(1.0, 0.60, 0.22);
  let cyan = vec3<f32>(0.44, 0.88, 1.0);
  let deep = vec3<f32>(0.03, 0.06, 0.13);

  var color = deep + saffron * (ring * 0.25 + field * 0.2 + drift * 0.28);
  color = color + cyan * (field * 0.18 + ring * 0.08);

  let vignette = smoothstep(1.8, 0.25, length(uv));
  color = color * vignette;

  let alpha = clamp((ring * 0.45 + field * 0.5 + drift * 0.2) * 0.9, 0.0, 0.9);
  return vec4<f32>(color, alpha);
}
`;

export default function WebGPULoaderBackdrop() {
  const canvasRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    let raf = null;
    let cleanup = () => {};

    const init = async () => {
      const canvas = canvasRef.current;
      if (!canvas || !navigator.gpu) {
        setIsSupported(false);
        return;
      }

      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) {
        setIsSupported(false);
        return;
      }

      const device = await adapter.requestDevice();
      const context = canvas.getContext("webgpu");
      const format = navigator.gpu.getPreferredCanvasFormat();

      const uniformData = new Float32Array(8);
      const uniformBuffer = device.createBuffer({
        size: uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: device.createShaderModule({ code: vertexShader }),
          entryPoint: "main"
        },
        fragment: {
          module: device.createShaderModule({ code: fragmentShader }),
          entryPoint: "main",
          targets: [{ format }]
        },
        primitive: { topology: "triangle-list" }
      });

      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
      });

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        canvas.width = width;
        canvas.height = height;
        context.configure({
          device,
          format,
          alphaMode: "premultiplied"
        });
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      const start = performance.now();
      const render = (now) => {
        const elapsed = (now - start) * 0.001;

        uniformData[0] = elapsed;
        uniformData[1] = canvas.width / Math.max(canvas.height, 1);
        uniformData[2] = canvas.width;
        uniformData[3] = canvas.height;
        uniformData[4] = Math.sin(elapsed * 2.0) * 0.5 + 0.5;
        uniformData[5] = 0;
        uniformData[6] = 0;
        uniformData[7] = 0;

        device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view,
              clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        });

        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();

        device.queue.submit([encoder.finish()]);
        raf = requestAnimationFrame(render);
      };

      raf = requestAnimationFrame(render);

      cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        observer.disconnect();
      };
    };

    init().catch(() => {
      setIsSupported(false);
    });

    return () => cleanup();
  }, []);

  return (
    <div className="loader-webgpu-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="loader-webgpu-canvas" />
      {!isSupported && <div className="loader-webgpu-fallback" />}
    </div>
  );
}

