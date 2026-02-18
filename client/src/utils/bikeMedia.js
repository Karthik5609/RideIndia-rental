const bikeTypeFallbacks = {
  commuter:
    "https://th.bing.com/th/id/OIP.Ld9_UdCqXcuQQsue1D_BEQHaD9?w=305&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3",
  touring: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Hero_Xpulse_200_2021_model.png",
  adventure:
    "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/himalayan/colors/new-studio-shots/hanle-black-tubeless/hanle-black-tubeless-000.webp",
  sports:
    "https://cdn.bajajauto.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-390-duke/ktm-390-duke-electric-orange.webp",
  cruiser: "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/meteor/product-shots/fireball-orange/fireball-orange1.png",
  scooter: "https://upload.wikimedia.org/wikipedia/commons/4/4f/TVS_Ntorq_125_Race_XP.jpg"
};

const defaultBikeImage =
  "https://upload.wikimedia.org/wikipedia/commons/8/80/BMW_G310_GS_front_2023-04.jpg";

export function getBikeImageUrl(bike) {
  return bike?.images?.[0] || bikeTypeFallbacks[bike?.type] || defaultBikeImage;
}

export function handleBikeImageError(event, bikeType) {
  const fallback = bikeTypeFallbacks[bikeType] || defaultBikeImage;
  if (event.currentTarget.src !== fallback) {
    event.currentTarget.src = fallback;
  }
}
