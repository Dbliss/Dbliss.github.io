# Descent landing sequence — image-generation prompt

Use this as an orchestration prompt. Produce eight separate image files with one image-generation call per frame; do not ask a single call to return an eight-image grid or collage.

## Inputs

Attach all existing references in `public/images/descent/1.png` through `8.png` that are available.

- Treat frame 1 as the canonical identity reference for the boat, fisherman, fishing rod, buoy, lighting, coastline, palette, and photographic rendering.
- Treat each corresponding numbered reference as composition and camera-depth guidance.
- For frames 2–8, also attach the immediately preceding approved output as a continuity reference.

## Locked scene identity

Create a coherent cinematic, photorealistic camera-dive sequence on a calm mountain lake at warm late-afternoon light.

The same physical boat must appear throughout every frame where the surface is visible:

- one compact, slightly weathered off-white fiberglass fishing dinghy
- the bow faces the camera with the same hull profile, gunwale, interior, stern equipment, scale, and wear marks
- one fisherman only
- the same adult fisherman in a dark charcoal jacket and trousers with a dark wide-brim hat
- the fisherman remains seated or steadily braced in the same part of the boat
- one fishing rod held at the same side, angled diagonally toward the upper-right
- one thin fishing line leading toward a small red-and-white striped buoy
- no added passengers, oars, motors, cabins, rails, canopies, flags, or equipment
- do not redesign, mirror, recolor, widen, shorten, or change the material of the boat
- do not change the fisherman's clothing, silhouette, body proportions, hat, or handedness

The environment must also remain continuous:

- distant hazy mountains concentrated on screen-right
- open horizon toward screen-left
- sun high on screen-right with one continuous warm reflection path
- calm blue-green water with small realistic ripples
- matching cloud shapes, weather, color grade, lens character, and time of day
- no text, names, buttons, logos, borders, frame labels, or watermark
- leave useful negative space on the left side of frame 1 for live HTML hero copy

Output every frame at exactly 1672 × 941 pixels, landscape, with identical color treatment and no transparency.

## Camera sequence

The world remains fixed. Only the camera travels forward and downward along the fishing line toward and through the water. The boat, person, mountains, sun, and buoy must not jump sideways between adjacent frames.

1. `1.png` — wide establishing hero above water. Boat small and centered near the horizon; buoy nearer the bottom-center; generous negative space at left.
2. `2.png` — camera closer and slightly lower. Boat moderately larger but still centered; buoy more prominent; same lens axis.
3. `3.png` — continue the same forward/downward move. Water occupies more of the frame; boat identity and fisherman pose remain unchanged.
4. `4.png` — camera just above the surface near the buoy. Foreground ripples are larger; boat approaches the upper-center; fishing line remains physically connected.
5. `5.png` — waterline transition begins. Lens is at the surface with a convincing split-level view; boat remains visible above the waterline and is never submerged or distorted.
6. `6.png` — lens passes through the surface. Mostly underwater, with a narrow coherent above-water strip; boat may be visible only through that strip; buoy reacts naturally at the surface.
7. `7.png` — fully underwater just below the surface, looking into clear blue water with soft descending sun rays. Do not invent a second boat or underwater fisherman.
8. `8.png` — slightly deeper underwater continuation, with the same water color, ray direction, particulate scale, and camera axis.

## Execution and consistency workflow

1. Generate or edit frame 1 first and approve it as the canonical identity image.
2. Generate each later frame as its own reference-grounded edit/generation call using frame 1 plus the immediately previous approved frame.
3. Change camera position and waterline state only. Repeat all locked boat/person invariants in every call.
4. After each frame, compare the boat hull, stern equipment, fisherman silhouette, hat, rod side/angle, buoy colors, mountain outline, sun position, and horizon.
5. If any locked feature changes, regenerate that complete frame before continuing. Do not accept identity drift and do not repair by pasting a separately generated boat over the scene.
6. Save the approved outputs as `public/images/descent/sequence-v2/1.png` through `public/images/descent/sequence-v2/8.png`.

Return exactly:

```text
outputs=[
  "public/images/descent/sequence-v2/1.png",
  "public/images/descent/sequence-v2/2.png",
  "public/images/descent/sequence-v2/3.png",
  "public/images/descent/sequence-v2/4.png",
  "public/images/descent/sequence-v2/5.png",
  "public/images/descent/sequence-v2/6.png",
  "public/images/descent/sequence-v2/7.png",
  "public/images/descent/sequence-v2/8.png"
]
qa_note=<one sentence confirming boat, fisherman, rod, buoy, lighting, and camera continuity>
```
