/**
 * Calculate source crop rectangle for drawing an image into a box,
 * with support for pan (offsetX/Y as -100..100) and scale (1 = fit, 2 = 2x zoom).
 */
export function getImageCropRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  offsetX = 0,
  offsetY = 0,
  scale = 1
) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;

  // Base cover-fit crop
  let sw: number, sh: number;
  if (imgRatio > boxRatio) {
    sh = imgH;
    sw = imgH * boxRatio;
  } else {
    sw = imgW;
    sh = imgW / boxRatio;
  }

  // Apply zoom (reduce the crop window = zoom in)
  const clampedScale = Math.max(1, scale);
  sw /= clampedScale;
  sh /= clampedScale;

  // Center then apply offset
  // offsetX: -100 = all the way left, +100 = all the way right
  const maxPanX = Math.max(0, (imgW - sw) / 2);
  const maxPanY = Math.max(0, (imgH - sh) / 2);

  const sx = (imgW - sw) / 2 + (offsetX / 100) * maxPanX;
  const sy = (imgH - sh) / 2 + (offsetY / 100) * maxPanY;

  return {
    sx: Math.max(0, Math.min(imgW - sw, sx)),
    sy: Math.max(0, Math.min(imgH - sh, sy)),
    sw,
    sh,
  };
}
