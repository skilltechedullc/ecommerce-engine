import { readFileSync, existsSync } from 'node:fs'

function loadLocalEnv() {
  if (!existsSync('.env.local')) return

  const content = readFileSync('.env.local', 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue

    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}

loadLocalEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation,resolution=merge-duplicates',
}

const qualityLine = 'Prepared under Millco certified quality systems: FSSAI Licensed, ISO 22000:2018, HACCP, GMP, Organic, Halal, APEDA, Coconut RCMC - CDB, Spices RCMC - Spices Board, and Export License Holder.'

const categories = [
  { name: 'Coconut Essentials', slug: 'coconut-essentials', sort_order: 10 },
  { name: 'Cold Pressed Oils', slug: 'cold-pressed-oils', sort_order: 20 },
  { name: 'Honey & Sweeteners', slug: 'honey-sweeteners', sort_order: 30 },
  { name: 'Spices & Masalas', slug: 'spices-masalas', sort_order: 40 },
  { name: 'Rice, Flour & Breakfast', slug: 'rice-flour-breakfast', sort_order: 50 },
  { name: 'Healthy Snacks', slug: 'healthy-snacks', sort_order: 60 },
  { name: 'Wellness Pantry', slug: 'wellness-pantry', sort_order: 70 },
  { name: 'Masala Powders', slug: 'masala-powders', sort_order: 80 },
  { name: 'Whole Spices', slug: 'whole-spices', sort_order: 90 },
  { name: 'Cooking Essentials', slug: 'cooking-essentials', sort_order: 100 },
  { name: 'Pickles & Condiments', slug: 'pickles-condiments', sort_order: 110 },
]

const products = [
  {
    name: 'Zero Sulphur Coconut Oil',
    slug: 'zero-sulphur-coconut-oil',
    category: 'Cold Pressed Oils',
    subcategory: 'Coconut Oil',
    description: `Clean everyday coconut oil made for family cooking without sulphur treatment. Ideal for Kerala-style cooking, tempering, and daily kitchen use. ${qualityLine}`,
    variants: [
      ['500ml Bottle', 249, 299, 48, 'MIL-OIL-ZSCO-500'],
      ['1L Bottle', 459, 549, 42, 'MIL-OIL-ZSCO-1L'],
      ['5L Can', 2149, 2499, 18, 'MIL-OIL-ZSCO-5L'],
    ],
  },
  {
    name: 'Virgin Coconut Oil',
    slug: 'virgin-coconut-oil',
    category: 'Coconut Essentials',
    subcategory: 'Virgin Oil',
    description: `Premium virgin coconut oil for wellness routines, traditional recipes, and personal care use. Naturally aromatic with careful batch handling. ${qualityLine}`,
    variants: [
      ['250ml Bottle', 219, 269, 36, 'MIL-COCO-VCO-250'],
      ['500ml Bottle', 399, 489, 28, 'MIL-COCO-VCO-500'],
    ],
  },
  {
    name: 'Cold Pressed Sesame Oil',
    slug: 'cold-pressed-sesame-oil',
    category: 'Cold Pressed Oils',
    subcategory: 'Sesame Oil',
    description: `Traditional sesame oil with a deep nutty profile for pickles, marinades, and everyday cooking. Cold-pressed for dependable taste and purity. ${qualityLine}`,
    variants: [
      ['500ml Bottle', 289, 349, 34, 'MIL-OIL-SES-500'],
      ['1L Bottle', 549, 649, 24, 'MIL-OIL-SES-1L'],
    ],
  },
  {
    name: 'Cold Pressed Groundnut Oil',
    slug: 'cold-pressed-groundnut-oil',
    category: 'Cold Pressed Oils',
    subcategory: 'Groundnut Oil',
    description: `Aromatic groundnut oil for high-heat Indian cooking, stir fries, and snacks. Made for homes that prefer clean pantry staples. ${qualityLine}`,
    variants: [
      ['500ml Bottle', 269, 329, 30, 'MIL-OIL-GND-500'],
      ['1L Bottle', 499, 599, 22, 'MIL-OIL-GND-1L'],
    ],
  },
  {
    name: 'Natural Forest Honey',
    slug: 'natural-forest-honey',
    category: 'Honey & Sweeteners',
    subcategory: 'Honey',
    description: `Naturally sourced forest honey with a rich, earthy sweetness for breakfast, drinks, and home remedies. Packed with care for everyday wellness. ${qualityLine}`,
    variants: [
      ['250g Jar', 169, 199, 40, 'MIL-HON-FOR-250'],
      ['500g Jar', 299, 369, 32, 'MIL-HON-FOR-500'],
      ['1kg Jar', 549, 649, 16, 'MIL-HON-FOR-1KG'],
    ],
  },
  {
    name: 'Multifloral Honey',
    slug: 'multifloral-honey',
    category: 'Honey & Sweeteners',
    subcategory: 'Honey',
    description: `Balanced multifloral honey with a mild floral sweetness. A pantry-friendly natural sweetener for tea, toast, smoothies, and desserts. ${qualityLine}`,
    variants: [
      ['250g Jar', 149, 179, 38, 'MIL-HON-MUL-250'],
      ['500g Jar', 269, 329, 30, 'MIL-HON-MUL-500'],
    ],
  },
  {
    name: 'Turmeric Powder',
    slug: 'turmeric-powder',
    category: 'Spices & Masalas',
    subcategory: 'Single Origin Spices',
    description: `Bright turmeric powder for curries, milk, marinades, and everyday cooking. Carefully processed for color, aroma, and consistency. ${qualityLine}`,
    variants: [
      ['100g Pouch', 69, 89, 60, 'MIL-SPC-TUR-100'],
      ['250g Pouch', 149, 189, 44, 'MIL-SPC-TUR-250'],
    ],
  },
  {
    name: 'Black Pepper Whole',
    slug: 'black-pepper-whole',
    category: 'Spices & Masalas',
    subcategory: 'Whole Spices',
    description: `Whole black pepper with a sharp, warm bite for fresh grinding, spice blends, soups, and traditional Kerala dishes. ${qualityLine}`,
    variants: [
      ['100g Pouch', 159, 199, 42, 'MIL-SPC-PEP-100'],
      ['250g Pouch', 369, 449, 24, 'MIL-SPC-PEP-250'],
    ],
  },
  {
    name: 'Green Cardamom',
    slug: 'green-cardamom',
    category: 'Spices & Masalas',
    subcategory: 'Whole Spices',
    description: `Fragrant green cardamom for tea, desserts, biryani, and premium spice blends. Packed in small batches to help preserve aroma. ${qualityLine}`,
    variants: [
      ['50g Pouch', 219, 269, 26, 'MIL-SPC-CAR-50'],
      ['100g Pouch', 419, 499, 18, 'MIL-SPC-CAR-100'],
    ],
  },
  {
    name: 'Red Chilli Powder',
    slug: 'red-chilli-powder',
    category: 'Spices & Masalas',
    subcategory: 'Ground Spices',
    description: `Vibrant chilli powder for everyday heat, color, and flavor. Suitable for curries, fries, marinades, and masala bases. ${qualityLine}`,
    variants: [
      ['100g Pouch', 79, 99, 52, 'MIL-SPC-CHI-100'],
      ['250g Pouch', 179, 219, 34, 'MIL-SPC-CHI-250'],
    ],
  },
  {
    name: 'Coriander Powder',
    slug: 'coriander-powder',
    category: 'Spices & Masalas',
    subcategory: 'Ground Spices',
    description: `Everyday coriander powder with warm citrus notes for gravies, vegetable dishes, and spice blends. ${qualityLine}`,
    variants: [
      ['100g Pouch', 59, 79, 58, 'MIL-SPC-COR-100'],
      ['250g Pouch', 129, 169, 40, 'MIL-SPC-COR-250'],
    ],
  },
  {
    name: 'Coconut Flour',
    slug: 'coconut-flour',
    category: 'Rice, Flour & Breakfast',
    subcategory: 'Flour',
    description: `Fine coconut flour for baking, breakfast mixes, and gluten-conscious pantry use. Mildly sweet, fibre-rich, and versatile. ${qualityLine}`,
    variants: [
      ['250g Pouch', 129, 159, 36, 'MIL-FLR-COCO-250'],
      ['500g Pouch', 239, 289, 24, 'MIL-FLR-COCO-500'],
    ],
  },
  {
    name: 'Rice Powder',
    slug: 'rice-powder',
    category: 'Rice, Flour & Breakfast',
    subcategory: 'Flour',
    description: `Smooth rice powder for puttu, appam, pathiri, snacks, and everyday traditional breakfast recipes. ${qualityLine}`,
    variants: [
      ['500g Pouch', 79, 99, 54, 'MIL-FLR-RICE-500'],
      ['1kg Pouch', 149, 179, 38, 'MIL-FLR-RICE-1KG'],
    ],
  },
  {
    name: 'Appam & Idiyappam Powder',
    slug: 'appam-idiyappam-powder',
    category: 'Rice, Flour & Breakfast',
    subcategory: 'Breakfast Mix',
    description: `Ready-to-use rice flour blend for soft appam and delicate idiyappam. Built for consistent breakfast preparation at home. ${qualityLine}`,
    variants: [
      ['500g Pouch', 89, 109, 48, 'MIL-MIX-APP-500'],
      ['1kg Pouch', 169, 199, 30, 'MIL-MIX-APP-1KG'],
    ],
  },
  {
    name: 'Ragi Flour',
    slug: 'ragi-flour',
    category: 'Rice, Flour & Breakfast',
    subcategory: 'Millet Flour',
    description: `Nutritious ragi flour for porridge, dosa, puttu, rotis, and healthy breakfast recipes. A useful staple for family kitchens. ${qualityLine}`,
    variants: [
      ['500g Pouch', 99, 129, 42, 'MIL-FLR-RAGI-500'],
      ['1kg Pouch', 189, 229, 24, 'MIL-FLR-RAGI-1KG'],
    ],
  },
  {
    name: 'Kerala Banana Chips',
    slug: 'kerala-banana-chips',
    category: 'Healthy Snacks',
    subcategory: 'Traditional Snacks',
    description: `Crisp Kerala-style banana chips made for tea-time, gifting, and family snacking. A familiar traditional bite with quality-led packing. ${qualityLine}`,
    variants: [
      ['100g Pouch', 69, 89, 50, 'MIL-SNK-BAN-100'],
      ['250g Pouch', 159, 199, 30, 'MIL-SNK-BAN-250'],
    ],
  },
  {
    name: 'Jackfruit Chips',
    slug: 'jackfruit-chips',
    category: 'Healthy Snacks',
    subcategory: 'Traditional Snacks',
    description: `Crunchy jackfruit chips with natural fruit character and a satisfying bite. Great for snack shelves and regional gifting. ${qualityLine}`,
    variants: [
      ['100g Pouch', 89, 109, 44, 'MIL-SNK-JAC-100'],
      ['250g Pouch', 199, 239, 28, 'MIL-SNK-JAC-250'],
    ],
  },
  {
    name: 'Roasted Coconut Chips',
    slug: 'roasted-coconut-chips',
    category: 'Healthy Snacks',
    subcategory: 'Coconut Snacks',
    description: `Lightly roasted coconut chips for snacking, smoothie bowls, desserts, and breakfast toppings. Crisp texture with clean coconut flavor. ${qualityLine}`,
    variants: [
      ['75g Pouch', 79, 99, 46, 'MIL-SNK-COC-75'],
      ['150g Pouch', 149, 179, 30, 'MIL-SNK-COC-150'],
    ],
  },
  {
    name: 'Herbal Kashaya Mix',
    slug: 'herbal-kashaya-mix',
    category: 'Wellness Pantry',
    subcategory: 'Herbal Mix',
    description: `Traditional herbal kashaya mix for warm wellness drinks. Designed for customers who prefer familiar home-style wellness routines. ${qualityLine}`,
    variants: [
      ['100g Pouch', 139, 169, 32, 'MIL-WEL-KAS-100'],
      ['250g Pouch', 299, 349, 20, 'MIL-WEL-KAS-250'],
    ],
  },
  {
    name: 'Moringa Leaf Powder',
    slug: 'moringa-leaf-powder',
    category: 'Wellness Pantry',
    subcategory: 'Superfood Powder',
    description: `Fine moringa leaf powder for smoothies, soups, batters, and wellness recipes. A simple way to add greens to daily food. ${qualityLine}`,
    variants: [
      ['100g Pouch', 149, 189, 34, 'MIL-WEL-MOR-100'],
      ['250g Pouch', 329, 399, 20, 'MIL-WEL-MOR-250'],
    ],
  },
  {
    name: 'Sambar Masala Powder',
    slug: 'sambar-masala-powder',
    category: 'Masala Powders',
    subcategory: 'South Indian Masala',
    description: `Balanced sambar masala with roasted spice depth for dal, vegetables, and traditional Kerala-style meals. Made for repeatable home cooking. ${qualityLine}`,
    variants: [
      ['100g Pouch', 89, 109, 52, 'MIL-MAS-SAM-100'],
      ['250g Pouch', 199, 239, 34, 'MIL-MAS-SAM-250'],
    ],
  },
  {
    name: 'Rasam Masala Powder',
    slug: 'rasam-masala-powder',
    category: 'Masala Powders',
    subcategory: 'South Indian Masala',
    description: `Peppery rasam masala for warm, comforting rasam with tamarind, tomato, and lentil notes. A practical daily kitchen blend. ${qualityLine}`,
    variants: [
      ['100g Pouch', 79, 99, 48, 'MIL-MAS-RAS-100'],
      ['250g Pouch', 179, 219, 30, 'MIL-MAS-RAS-250'],
    ],
  },
  {
    name: 'Chicken Masala Powder',
    slug: 'chicken-masala-powder',
    category: 'Masala Powders',
    subcategory: 'Non-Veg Masala',
    description: `Aromatic chicken masala for roast, curry, fry, and marinade recipes. Blended for rich color, warmth, and consistent taste. ${qualityLine}`,
    variants: [
      ['100g Pouch', 99, 129, 50, 'MIL-MAS-CHK-100'],
      ['250g Pouch', 229, 279, 32, 'MIL-MAS-CHK-250'],
    ],
  },
  {
    name: 'Meat Masala Powder',
    slug: 'meat-masala-powder',
    category: 'Masala Powders',
    subcategory: 'Non-Veg Masala',
    description: `Robust meat masala for beef, mutton, and slow-cooked gravies. Built for deep spice character without overpowering the dish. ${qualityLine}`,
    variants: [
      ['100g Pouch', 109, 139, 44, 'MIL-MAS-MEAT-100'],
      ['250g Pouch', 249, 299, 28, 'MIL-MAS-MEAT-250'],
    ],
  },
  {
    name: 'Fish Masala Powder',
    slug: 'fish-masala-powder',
    category: 'Masala Powders',
    subcategory: 'Seafood Masala',
    description: `Coastal-style fish masala for curry, fry, and marinade use. Designed to pair well with coconut, tamarind, and chilli-forward recipes. ${qualityLine}`,
    variants: [
      ['100g Pouch', 89, 119, 46, 'MIL-MAS-FISH-100'],
      ['250g Pouch', 209, 259, 30, 'MIL-MAS-FISH-250'],
    ],
  },
  {
    name: 'Garam Masala Powder',
    slug: 'garam-masala-powder',
    category: 'Masala Powders',
    subcategory: 'Classic Masala',
    description: `Warm finishing masala for curries, rice dishes, gravies, and marinades. A dependable spice blend for everyday Indian cooking. ${qualityLine}`,
    variants: [
      ['50g Pouch', 79, 99, 50, 'MIL-MAS-GAR-50'],
      ['100g Pouch', 149, 179, 34, 'MIL-MAS-GAR-100'],
    ],
  },
  {
    name: 'Cumin Seeds',
    slug: 'cumin-seeds',
    category: 'Whole Spices',
    subcategory: 'Seeds',
    description: `Whole cumin seeds for tempering, spice blends, jeera rice, and everyday curries. Clean aroma and consistent quality for home kitchens. ${qualityLine}`,
    variants: [
      ['100g Pouch', 89, 109, 54, 'MIL-WSP-CUM-100'],
      ['250g Pouch', 199, 249, 34, 'MIL-WSP-CUM-250'],
    ],
  },
  {
    name: 'Mustard Seeds',
    slug: 'mustard-seeds',
    category: 'Whole Spices',
    subcategory: 'Seeds',
    description: `Whole mustard seeds for tadka, pickles, curries, and South Indian cooking. A high-rotation pantry essential. ${qualityLine}`,
    variants: [
      ['100g Pouch', 49, 69, 64, 'MIL-WSP-MUS-100'],
      ['250g Pouch', 109, 139, 42, 'MIL-WSP-MUS-250'],
    ],
  },
  {
    name: 'Fenugreek Seeds',
    slug: 'fenugreek-seeds',
    category: 'Whole Spices',
    subcategory: 'Seeds',
    description: `Fenugreek seeds for pickles, spice mixes, dosa batter routines, and traditional recipes that need a lightly bitter depth. ${qualityLine}`,
    variants: [
      ['100g Pouch', 59, 79, 48, 'MIL-WSP-FEN-100'],
      ['250g Pouch', 129, 159, 32, 'MIL-WSP-FEN-250'],
    ],
  },
  {
    name: 'Cloves Whole',
    slug: 'cloves-whole',
    category: 'Whole Spices',
    subcategory: 'Premium Whole Spices',
    description: `Whole cloves with bold warmth for biryani, tea, garam masala, and festive cooking. Packed for aroma retention. ${qualityLine}`,
    variants: [
      ['50g Pouch', 149, 189, 30, 'MIL-WSP-CLO-50'],
      ['100g Pouch', 279, 339, 18, 'MIL-WSP-CLO-100'],
    ],
  },
  {
    name: 'Cinnamon Sticks',
    slug: 'cinnamon-sticks',
    category: 'Whole Spices',
    subcategory: 'Premium Whole Spices',
    description: `Cinnamon sticks for tea, desserts, rice dishes, spice blends, and slow-cooked gravies. A fragrant essential for premium pantry shelves. ${qualityLine}`,
    variants: [
      ['50g Pouch', 109, 139, 34, 'MIL-WSP-CIN-50'],
      ['100g Pouch', 199, 249, 22, 'MIL-WSP-CIN-100'],
    ],
  },
  {
    name: 'Coconut Milk Powder',
    slug: 'coconut-milk-powder',
    category: 'Coconut Essentials',
    subcategory: 'Coconut Pantry',
    description: `Convenient coconut milk powder for curries, desserts, stews, and quick kitchen prep. Useful for retail, grocery, and export-friendly shelves. ${qualityLine}`,
    variants: [
      ['100g Pouch', 119, 149, 40, 'MIL-COCO-MILK-100'],
      ['250g Pouch', 279, 329, 24, 'MIL-COCO-MILK-250'],
    ],
  },
  {
    name: 'Desiccated Coconut',
    slug: 'desiccated-coconut',
    category: 'Coconut Essentials',
    subcategory: 'Coconut Pantry',
    description: `Fine desiccated coconut for sweets, bakery, breakfast bowls, and snack manufacturing. Clean coconut taste with versatile usage. ${qualityLine}`,
    variants: [
      ['250g Pouch', 119, 149, 42, 'MIL-COCO-DES-250'],
      ['500g Pouch', 219, 269, 28, 'MIL-COCO-DES-500'],
    ],
  },
  {
    name: 'Coconut Sugar',
    slug: 'coconut-sugar',
    category: 'Honey & Sweeteners',
    subcategory: 'Natural Sweetener',
    description: `Coconut sugar with caramel notes for beverages, desserts, baking, and healthier pantry swaps. A strong add-on for wellness stores. ${qualityLine}`,
    variants: [
      ['250g Pouch', 189, 229, 30, 'MIL-SWT-COCS-250'],
      ['500g Pouch', 349, 419, 20, 'MIL-SWT-COCS-500'],
    ],
  },
  {
    name: 'Jaggery Powder',
    slug: 'jaggery-powder',
    category: 'Honey & Sweeteners',
    subcategory: 'Natural Sweetener',
    description: `Easy-to-use jaggery powder for tea, payasam, sweets, breakfast mixes, and traditional recipes. A natural sweetener for daily kitchens. ${qualityLine}`,
    variants: [
      ['500g Pouch', 99, 129, 44, 'MIL-SWT-JAG-500'],
      ['1kg Pouch', 189, 229, 28, 'MIL-SWT-JAG-1KG'],
    ],
  },
  {
    name: 'Coconut Vinegar',
    slug: 'coconut-vinegar',
    category: 'Cooking Essentials',
    subcategory: 'Vinegar',
    description: `Coconut vinegar for marinades, pickles, dressings, and coastal cooking. A practical cooking essential for grocery and pantry shoppers. ${qualityLine}`,
    variants: [
      ['250ml Bottle', 99, 129, 36, 'MIL-ESS-VIN-250'],
      ['500ml Bottle', 179, 219, 24, 'MIL-ESS-VIN-500'],
    ],
  },
  {
    name: 'Tender Mango Pickle',
    slug: 'tender-mango-pickle',
    category: 'Pickles & Condiments',
    subcategory: 'Pickles',
    description: `Tangy tender mango pickle with traditional spice notes for rice meals, curd rice, and quick sides. A familiar regional favourite. ${qualityLine}`,
    variants: [
      ['200g Jar', 129, 159, 38, 'MIL-PIC-MAN-200'],
      ['400g Jar', 239, 289, 24, 'MIL-PIC-MAN-400'],
    ],
  },
  {
    name: 'Lime Pickle',
    slug: 'lime-pickle',
    category: 'Pickles & Condiments',
    subcategory: 'Pickles',
    description: `Classic lime pickle with bright sourness, warm spice, and everyday meal compatibility. Great with rice, kanji, dosa, and chapati. ${qualityLine}`,
    variants: [
      ['200g Jar', 119, 149, 40, 'MIL-PIC-LIM-200'],
      ['400g Jar', 219, 269, 24, 'MIL-PIC-LIM-400'],
    ],
  },
  {
    name: 'Curry Leaves Powder',
    slug: 'curry-leaves-powder',
    category: 'Wellness Pantry',
    subcategory: 'Superfood Powder',
    description: `Curry leaves powder for rice mixes, chutneys, seasoning, and wellness-friendly recipes. A useful regional pantry add-on. ${qualityLine}`,
    variants: [
      ['100g Pouch', 99, 129, 36, 'MIL-WEL-CUR-100'],
      ['250g Pouch', 229, 279, 22, 'MIL-WEL-CUR-250'],
    ],
  },
]

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${text}`)
  }

  return body
}

await request('product_categories?on_conflict=slug', {
  method: 'POST',
  body: JSON.stringify(categories.map((category) => ({ ...category, is_active: true }))),
})

let productCount = 0
let variantCount = 0

for (const item of products) {
  const minVariant = item.variants.reduce((lowest, variant) => variant[1] < lowest[1] ? variant : lowest, item.variants[0])
  const totalStock = item.variants.reduce((sum, variant) => sum + variant[3], 0)

  const [product] = await request('products?on_conflict=slug', {
    method: 'POST',
    body: JSON.stringify([{
      name: item.name,
      slug: item.slug,
      description: item.description,
      image: null,
      category: item.category,
      subcategory: item.subcategory,
      price: minVariant[1],
      stock: totalStock,
      is_active: true,
    }]),
  })

  const variants = item.variants.map(([weight, price, compareAtPrice, stock, sku]) => ({
    product_id: product.id,
    weight,
    price,
    compare_at_price: compareAtPrice,
    stock,
    sku,
    image: [],
  }))

  await request(`product_variants?product_id=eq.${product.id}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  })

  await request('product_variants', {
    method: 'POST',
    body: JSON.stringify(variants),
  })

  productCount += 1
  variantCount += variants.length
}

console.log(JSON.stringify({
  status: 'ok',
  categories: categories.length,
  products: productCount,
  variants: variantCount,
  note: 'Images intentionally left empty for real product photos.',
}, null, 2))
