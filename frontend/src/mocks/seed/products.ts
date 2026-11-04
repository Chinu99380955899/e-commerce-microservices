import type { CategoryKey } from '../../api/schemas';

export interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  category: CategoryKey;
  brand: string | null;
  price: number;
  stockQuantity: number;
}

/** Products 01–12 mirror the spec's catalogue table; 13–40 are demo additions. */
export const seedProducts: readonly SeedProduct[] = [
  {
    sku: 'AUD-ANC-100',
    name: 'Aura Pods ANC Earbuds',
    description:
      'True wireless earbuds with active noise cancellation for commutes, flights and focused work.',
    category: 'electronics',
    brand: 'AuraSound',
    price: 4999,
    stockQuantity: 120,
  },
  {
    sku: 'AUD-OVR-200',
    name: 'Studio Over-Ear Headphones',
    description:
      'Over-ear wireless headphones with deep bass, soft memory-foam cushions and 40-hour battery life.',
    category: 'electronics',
    brand: 'AuraSound',
    price: 8999,
    stockQuantity: 45,
  },
  {
    sku: 'KIT-FLK-750',
    name: 'Steel Vacuum Flask 750ml',
    description:
      'Double-wall vacuum insulated steel flask. Keeps tea and coffee hot for 12 hours, ideal for a long train trip or the office.',
    category: 'kitchen',
    brand: 'Thermique',
    price: 1299,
    stockQuantity: 300,
  },
  {
    sku: 'KIT-PRS-500',
    name: 'Pressure Cooker 5L Induction',
    description:
      'Five-litre induction-base pressure cooker with a safety lock, for quick rice, dal and one-pot meals.',
    category: 'kitchen',
    brand: 'HomeChef',
    price: 2499,
    stockQuantity: 80,
  },
  {
    sku: 'FIT-YMT-006',
    name: 'Anti-Slip Yoga Mat 6mm',
    description:
      'Cushioned six-millimetre yoga mat with a non-slip surface for yoga, pilates and floor workouts.',
    category: 'fitness',
    brand: 'FlexForm',
    price: 899,
    stockQuantity: 200,
  },
  {
    sku: 'FIT-DMB-010',
    name: 'Adjustable Dumbbell Set 10kg',
    description:
      'Adjustable dumbbell pair from 2 to 10 kg for strength training at home or in the gym.',
    category: 'fitness',
    brand: 'FlexForm',
    price: 3499,
    stockQuantity: 60,
  },
  {
    sku: 'BAG-LPT-015',
    name: 'Laptop Backpack 15.6"',
    description:
      'Padded laptop backpack with a 15.6-inch sleeve, water-resistant fabric and a laptop bag pocket for the daily commute.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 1799,
    stockQuantity: 150,
  },
  {
    sku: 'BAG-TRL-055',
    name: 'Cabin Trolley Bag 55cm',
    description:
      'Lightweight hard-shell cabin trolley with 360-degree wheels, a TSA lock and an expandable main compartment.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 4299,
    stockQuantity: 40,
  },
  {
    sku: 'HOM-LMP-LED',
    name: 'Smart LED Desk Lamp',
    description:
      'Dimmable LED desk lamp with five colour temperatures and a USB charging port for late-night reading and study.',
    category: 'home',
    brand: 'Lumina',
    price: 1599,
    stockQuantity: 90,
  },
  {
    sku: 'HOM-PUR-HEP',
    name: 'HEPA Air Purifier',
    description:
      'Room air purifier with a true HEPA filter that removes dust, pollen and smoke. Quiet enough for sleep.',
    category: 'home',
    brand: 'PureNest',
    price: 9999,
    stockQuantity: 25,
  },
  {
    sku: 'BOK-JAV-021',
    name: 'Modern Java in Action (Paperback)',
    description:
      'A practical guide to modern Java: records, streams, virtual threads and building maintainable services.',
    category: 'books',
    brand: 'TechPress',
    price: 699,
    stockQuantity: 75,
  },
  {
    sku: 'ELE-PWB-20K',
    name: 'Power Bank 20000mAh',
    description:
      'High-capacity 20000mAh power bank with 22.5W fast charging for phones, tablets and earbuds on the go.',
    category: 'electronics',
    brand: 'VoltX',
    price: 1899,
    stockQuantity: 0,
  },
  {
    sku: 'AUD-SPT-300',
    name: 'Sport Wireless Earbuds for Gym',
    description:
      'Sweat-resistant wireless earbuds with secure ear hooks, built for gym workouts, running and cycling.',
    category: 'electronics',
    brand: 'PulseFit',
    price: 2799,
    stockQuantity: 85,
  },
  {
    sku: 'AUD-BUD-120',
    name: 'Budget True Wireless Earbuds',
    description:
      'Affordable everyday earbuds with clear calls and a 20-hour battery for commutes and daily listening.',
    category: 'electronics',
    brand: 'Bolt',
    price: 1199,
    stockQuantity: 4,
  },
  {
    sku: 'AUD-NCK-150',
    name: 'Neckband Bluetooth Earphones',
    description:
      'Lightweight neckband earphones with magnetic earbuds, good for workouts and everyday listening.',
    category: 'electronics',
    brand: 'Bolt',
    price: 1399,
    stockQuantity: 60,
  },
  {
    sku: 'KIT-MUG-400',
    name: 'Insulated Travel Mug 400ml',
    description:
      'Double-wall steel travel mug with a spill-proof lid. Keeps coffee and tea hot on the commute or a long train trip.',
    category: 'kitchen',
    brand: 'Thermique',
    price: 899,
    stockQuantity: 150,
  },
  {
    sku: 'KIT-LNB-800',
    name: 'Steel Lunch Box with 3 Compartments',
    description:
      'Leak-proof steel lunch box with three compartments, for rice, dal and salad at the office or school.',
    category: 'kitchen',
    brand: 'HomeChef',
    price: 749,
    stockQuantity: 210,
  },
  {
    sku: 'KIT-TEA-606',
    name: 'Ceramic Tea Set with 6 Cups',
    description: 'Hand-glazed ceramic teapot with six cups, for serving tea and chai to guests.',
    category: 'kitchen',
    brand: 'Chai Co',
    price: 1599,
    stockQuantity: 0,
  },
  {
    sku: 'KIT-BLN-600',
    name: 'Mini Blender 600ml',
    description: 'Compact personal blender for smoothies, shakes and fresh juice in the morning.',
    category: 'kitchen',
    brand: 'HomeChef',
    price: 1999,
    stockQuantity: 35,
  },
  {
    sku: 'KIT-KNF-PRO',
    name: "Chef's Knife Set",
    description:
      'Three stainless steel knives for everyday cooking, chopping vegetables and slicing bread.',
    category: 'kitchen',
    brand: 'HomeChef',
    price: 2199,
    stockQuantity: 2,
  },
  {
    sku: 'FIT-RES-050',
    name: 'Resistance Band Set',
    description:
      'Five latex-free resistance bands for home workouts, stretching and physiotherapy exercises.',
    category: 'fitness',
    brand: 'FlexForm',
    price: 799,
    stockQuantity: 180,
  },
  {
    sku: 'FIT-BTL-750',
    name: 'Running Water Bottle 750ml',
    description:
      'Lightweight leak-proof bottle with a flip lid, made for runs, gym sessions and hiking.',
    category: 'fitness',
    brand: 'PulseFit',
    price: 499,
    stockQuantity: 300,
  },
  {
    sku: 'FIT-SKP-003',
    name: 'Speed Skipping Rope',
    description:
      'Adjustable steel-cable skipping rope with ball bearings, for cardio and boxing training.',
    category: 'fitness',
    brand: 'PulseFit',
    price: 349,
    stockQuantity: 240,
  },
  {
    sku: 'FIT-BEN-001',
    name: 'Foldable Weight Bench',
    description:
      'Adjustable foldable bench for strength training at home, with a padded seat and a sturdy steel frame.',
    category: 'fitness',
    brand: 'FlexForm',
    price: 4999,
    stockQuantity: 0,
  },
  {
    sku: 'BAG-DUF-040',
    name: 'Gym Duffel Bag 40L',
    description:
      'Water-resistant 40-litre gym duffel with a separate shoe compartment, for gym sessions and weekend trips.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 1499,
    stockQuantity: 70,
  },
  {
    sku: 'BAG-SLV-140',
    name: 'Laptop Sleeve 14-inch',
    description:
      'Padded felt laptop sleeve that protects your laptop in the office or on the commute.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 999,
    stockQuantity: 95,
  },
  {
    sku: 'BAG-SLV-160',
    name: 'Laptop Sleeve 16-inch Pro',
    description:
      'Slim shock-absorbing laptop sleeve for 16-inch laptops, with a zip pocket for chargers.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 1199,
    stockQuantity: 5,
  },
  {
    sku: 'BAG-BPK-010',
    name: 'Commuter Backpack 25L',
    description:
      'Anti-theft commuter backpack with a USB port and a laptop compartment for office days.',
    category: 'bags',
    brand: 'UrbanTrail',
    price: 2299,
    stockQuantity: 50,
  },
  {
    sku: 'HOM-ALM-500',
    name: 'Smart Alarm Clock with Sunrise Light',
    description:
      'Wake-up light that simulates a sunrise to help you wake up gently. Includes a bedside alarm and radio.',
    category: 'home',
    brand: 'Lumina',
    price: 2199,
    stockQuantity: 40,
  },
  {
    sku: 'HOM-RUG-150',
    name: 'Anti-Slip Bath Mat',
    description:
      'Quick-dry microfibre bath mat with a non-slip base that keeps bathroom floors safe and dry.',
    category: 'home',
    brand: 'PureNest',
    price: 599,
    stockQuantity: 130,
  },
  {
    sku: 'HOM-HUM-300',
    name: 'Ultrasonic Humidifier 3L',
    description:
      'Quiet 3-litre humidifier that adds moisture to dry air in the bedroom while you sleep.',
    category: 'home',
    brand: 'PureNest',
    price: 1799,
    stockQuantity: 55,
  },
  {
    sku: 'HOM-CUS-020',
    name: 'Cushion Covers Set of 5',
    description: 'Set of five soft cotton cushion covers that refresh the living room and bedroom.',
    category: 'home',
    brand: 'Lumina',
    price: 699,
    stockQuantity: 160,
  },
  {
    sku: 'BOK-SPB-001',
    name: 'Spring Boot in Action',
    description:
      'A practical guide to building production REST services and microservices with Spring Boot.',
    category: 'books',
    brand: 'TechPress',
    price: 899,
    stockQuantity: 1,
  },
  {
    sku: 'BOK-KFK-002',
    name: 'Apache Kafka Essentials',
    description:
      'Guide to event streaming with Apache Kafka: topics, partitions, consumer groups and reliable messaging.',
    category: 'books',
    brand: 'TechPress',
    price: 949,
    stockQuantity: 30,
  },
  {
    sku: 'BOK-MNT-003',
    name: 'Mindful Running Journal',
    description:
      'A training journal for runners who want to track distance, sleep and recovery each week.',
    category: 'books',
    brand: 'Sunrise Press',
    price: 499,
    stockQuantity: 80,
  },
  {
    sku: 'ELE-WCH-010',
    name: 'Wireless Charging Pad',
    description:
      'Fast 15W wireless charging pad for phones and earbuds, with an LED indicator and a non-slip surface.',
    category: 'electronics',
    brand: 'VoltX',
    price: 1199,
    stockQuantity: 0,
  },
  {
    sku: 'ELE-HDM-020',
    name: 'USB-C Hub 7-in-1',
    description:
      'Seven-port USB-C hub with HDMI, SD card reader and USB 3.0 ports for laptops at the desk.',
    category: 'electronics',
    brand: 'VoltX',
    price: 2499,
    stockQuantity: 60,
  },
  {
    sku: 'ELE-WCM-720',
    name: 'HD Webcam 1080p',
    description:
      'Full HD webcam with built-in microphone, for office video calls and online classes.',
    category: 'electronics',
    brand: 'ViewPoint',
    price: 2899,
    stockQuantity: 22,
  },
  {
    sku: 'KIT-COF-500',
    name: 'Pour-Over Coffee Maker',
    description:
      'Pour-over dripper with a glass carafe, for brewing a clean cup of coffee at home or at the office.',
    category: 'kitchen',
    brand: 'Chai Co',
    price: 1299,
    stockQuantity: 45,
  },
  {
    sku: 'HOM-PLT-200',
    name: 'Indoor Plant Pot Set of 3',
    description:
      'Set of three ceramic indoor plant pots with drainage holes, for desks, shelves and living rooms.',
    category: 'home',
    brand: 'PureNest',
    price: 849,
    stockQuantity: 90,
  },
];
