// Заставки запуска для iPhone. Файлы делает scripts/make_icons.py.
// iPhone берёт заставку по размеру экрана, плотности и теме телефона.
const DEVICES: [number, number, number][] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2],
]

export const startupImages = DEVICES.flatMap(([w, h, k]) =>
  (['light', 'dark'] as const).map(theme => ({
    url: `/splash/splash-${w}x${h}-${k}x-dark.png`,
    media:
      `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${k})` +
      ` and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  }))
)
