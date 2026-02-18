import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import Bike from "./models/Bike.js";

dotenv.config();

const sampleBikes = [
  {
    name: "Himalayan Expedition",
    brand: "Royal Enfield",
    model: "Himalayan 450",
    type: "adventure",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 2200,
    specs: { engineCC: 452, mileageKmpl: 30, fuelType: "petrol", abs: true, weightKg: 196 },
    rating: 4.8,
    images: [
      "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/himalayan/colors/new-studio-shots/hanle-black-tubeless/hanle-black-tubeless-000.webp"
    ]
  },
  {
    name: "City Sprint",
    brand: "Yamaha",
    model: "FZ-S V4",
    type: "commuter",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 1200,
    specs: { engineCC: 149, mileageKmpl: 45, fuelType: "petrol", abs: true, weightKg: 136 },
    rating: 4.4,
    images: [
      "https://th.bing.com/th/id/OIP.Ld9_UdCqXcuQQsue1D_BEQHaD9?w=305&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3"
    ]
  },
  {
    name: "Coastal Cruiser",
    brand: "KTM",
    model: "390 Duke",
    type: "sports",
    location: { city: "Goa", state: "Goa" },
    pricePerDay: 1900,
    specs: { engineCC: 373, mileageKmpl: 28, fuelType: "petrol", abs: true, weightKg: 171 },
    rating: 4.6,
    images: [
      "https://cdn.bajajauto.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-390-duke/ktm-390-duke-electric-orange.webp"
    ]
  },
  {
    name: "Mountain Companion",
    brand: "Hero",
    model: "Xpulse 200",
    type: "touring",
    location: { city: "Ooty", state: "Tamil Nadu" },
    pricePerDay: 1500,
    specs: { engineCC: 199, mileageKmpl: 38, fuelType: "petrol", abs: true, weightKg: 157 },
    rating: 4.5,
    images: ["https://upload.wikimedia.org/wikipedia/commons/b/bf/Hero_Xpulse_200_2021_model.png"]
  },
  {
    name: "Hill Glider",
    brand: "Honda",
    model: "Activa 125",
    type: "scooter",
    location: { city: "Mysuru", state: "Karnataka" },
    pricePerDay: 900,
    specs: { engineCC: 124, mileageKmpl: 50, fuelType: "petrol", abs: false, weightKg: 110 },
    rating: 4.2,
    images: ["https://upload.wikimedia.org/wikipedia/commons/e/ec/Gold_Metallic_Honda_Activa.jpg"]
  },
  {
    name: "Snow Rider",
    brand: "Royal Enfield",
    model: "Classic 350",
    type: "cruiser",
    location: { city: "Manali", state: "Himachal Pradesh" },
    pricePerDay: 1800,
    specs: { engineCC: 349, mileageKmpl: 34, fuelType: "petrol", abs: true, weightKg: 195 },
    rating: 4.7,
    images: [
      "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/new-classic-350/studio-shots/360/emerald/01.png"
    ]
  },
  {
    name: "Ladakh Trail Pro",
    brand: "BMW",
    model: "G 310 GS",
    type: "adventure",
    location: { city: "Leh", state: "Ladakh" },
    pricePerDay: 2600,
    specs: { engineCC: 313, mileageKmpl: 30, fuelType: "petrol", abs: true, weightKg: 169 },
    rating: 4.8,
    images: ["https://upload.wikimedia.org/wikipedia/commons/8/80/BMW_G310_GS_front_2023-04.jpg"]
  },
  {
    name: "Desert Storm",
    brand: "KTM",
    model: "250 Adventure",
    type: "adventure",
    location: { city: "Jaipur", state: "Rajasthan" },
    pricePerDay: 2100,
    specs: { engineCC: 248, mileageKmpl: 32, fuelType: "petrol", abs: true, weightKg: 177 },
    rating: 4.5,
    images: [
      "https://cdn.bajajauto.com/-/media/images/ktm/booking/ktm-pngs-and-webps/2025-ktm-250-adventure/ktm-250-adventure_orange.webp"
    ]
  },
  {
    name: "Konkan Glide",
    brand: "TVS",
    model: "Ntorq 125",
    type: "scooter",
    location: { city: "Mumbai", state: "Maharashtra" },
    pricePerDay: 1100,
    specs: { engineCC: 124, mileageKmpl: 45, fuelType: "petrol", abs: false, weightKg: 118 },
    rating: 4.3,
    images: ["https://upload.wikimedia.org/wikipedia/commons/4/4f/TVS_Ntorq_125_Race_XP.jpg"]
  },
  {
    name: "Western Ghats Tourer",
    brand: "Suzuki",
    model: "V-Strom SX",
    type: "touring",
    location: { city: "Kochi", state: "Kerala" },
    pricePerDay: 2000,
    specs: { engineCC: 249, mileageKmpl: 36, fuelType: "petrol", abs: true, weightKg: 167 },
    rating: 4.6,
    images: ["https://upload.wikimedia.org/wikipedia/commons/1/13/Suzuki_DL250_V-Strom.jpg"]
  },
  {
    name: "Pune Pulse",
    brand: "Bajaj",
    model: "Pulsar NS200",
    type: "sports",
    location: { city: "Pune", state: "Maharashtra" },
    pricePerDay: 1400,
    specs: { engineCC: 199, mileageKmpl: 35, fuelType: "petrol", abs: true, weightKg: 158 },
    rating: 4.4,
    images: [
      "https://cdn.bajajauto.com/-/media/assets/bajajauto/bikes/pulsarns200/newns200-360-degree/red/ns200-360-webp/00.webp"
    ]
  },
  {
    name: "Lake City Cruiser",
    brand: "Royal Enfield",
    model: "Meteor 350",
    type: "cruiser",
    location: { city: "Udaipur", state: "Rajasthan" },
    pricePerDay: 1750,
    specs: { engineCC: 349, mileageKmpl: 33, fuelType: "petrol", abs: true, weightKg: 191 },
    rating: 4.5,
    images: [
      "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/meteor/product-shots/fireball-orange/fireball-orange1.png"
    ]
  },
  {
    name: "River Bend Rider",
    brand: "Hero",
    model: "Xpulse 200 4V",
    type: "touring",
    location: { city: "Rishikesh", state: "Uttarakhand" },
    pricePerDay: 1600,
    specs: { engineCC: 199, mileageKmpl: 37, fuelType: "petrol", abs: true, weightKg: 159 },
    rating: 4.6,
    images: ["https://upload.wikimedia.org/wikipedia/commons/5/53/Hero_Xpulse_200_4V_Pro.jpg"]
  },
  {
    name: "Bengaluru Trail Rider",
    brand: "Hero",
    model: "Xpulse 200 4V",
    type: "touring",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 1650,
    specs: { engineCC: 199, mileageKmpl: 37, fuelType: "petrol", abs: true, weightKg: 159 },
    rating: 4.7,
    images: ["https://upload.wikimedia.org/wikipedia/commons/5/53/Hero_Xpulse_200_4V_Pro.jpg"]
  },
  {
    name: "Silicon Street Duke",
    brand: "KTM",
    model: "390 Duke",
    type: "sports",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 2050,
    specs: { engineCC: 373, mileageKmpl: 29, fuelType: "petrol", abs: true, weightKg: 171 },
    rating: 4.6,
    images: [
      "https://cdn.bajajauto.com/-/media/images/ktm/booking/ktm-pngs-and-webps/ktm-390-duke/ktm-390-duke-electric-orange.webp"
    ]
  },
  {
    name: "Metro Meteor",
    brand: "Royal Enfield",
    model: "Meteor 350",
    type: "cruiser",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 1850,
    specs: { engineCC: 349, mileageKmpl: 33, fuelType: "petrol", abs: true, weightKg: 191 },
    rating: 4.5,
    images: [
      "https://www.royalenfield.com/content/dam/royal-enfield/motorcycles/meteor/product-shots/fireball-orange/fireball-orange1.png"
    ]
  },
  {
    name: "City Hopper",
    brand: "TVS",
    model: "Ntorq 125",
    type: "scooter",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 1050,
    specs: { engineCC: 124, mileageKmpl: 45, fuelType: "petrol", abs: false, weightKg: 118 },
    rating: 4.3,
    images: ["https://upload.wikimedia.org/wikipedia/commons/4/4f/TVS_Ntorq_125_Race_XP.jpg"]
  },
  {
    name: "Weekend GS",
    brand: "BMW",
    model: "G 310 GS",
    type: "adventure",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 2750,
    specs: { engineCC: 313, mileageKmpl: 29, fuelType: "petrol", abs: true, weightKg: 169 },
    rating: 4.8,
    images: ["https://upload.wikimedia.org/wikipedia/commons/8/80/BMW_G310_GS_front_2023-04.jpg"]
  },
  {
    name: "Karnataka Tour Master",
    brand: "Suzuki",
    model: "V-Strom SX",
    type: "touring",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 2100,
    specs: { engineCC: 249, mileageKmpl: 36, fuelType: "petrol", abs: true, weightKg: 167 },
    rating: 4.6,
    images: ["https://upload.wikimedia.org/wikipedia/commons/1/13/Suzuki_DL250_V-Strom.jpg"]
  },
  {
    name: "Marina Ninja",
    brand: "Kawasaki",
    model: "Ninja 300",
    type: "sports",
    location: { city: "Bengaluru", state: "Karnataka" },
    pricePerDay: 2900,
    specs: { engineCC: 296, mileageKmpl: 27, fuelType: "petrol", abs: true, weightKg: 179 },
    rating: 4.8,
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Kawasaki_Ninja_300_2013_Showroom.JPG/330px-Kawasaki_Ninja_300_2013_Showroom.JPG"
    ]
  }
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }
    await connectDB(process.env.MONGO_URI);
    await Bike.deleteMany({});
    await Bike.insertMany(sampleBikes);
    console.log("Seed complete: bikes inserted.");
  } catch (error) {
    console.error("Seed failed:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
