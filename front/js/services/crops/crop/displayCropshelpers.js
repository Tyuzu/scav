import { createElement } from "../../../components/createElement";
import { navigate } from "../../../routes";

const normalizedCategoryMap = new Map([
  // Fruits
  ["mango", "fruits"], ["banana", "fruits"], ["apple", "fruits"], ["guava", "fruits"], ["papaya", "fruits"], ["orange", "fruits"], ["grapes", "fruits"], ["pineapple", "fruits"], ["litchi", "fruits"], ["watermelon", "fruits"], ["melon", "fruits"], ["lemon", "fruits"], ["strawberry", "fruits"],

  // Vegetables
  ["tomato", "vegetables"], ["onion", "vegetables"], ["potato", "vegetables"], ["spinach", "vegetables"], ["carrot", "vegetables"], ["cabbage", "vegetables"], ["cauliflower", "vegetables"], ["garlic", "vegetables"], ["radish", "vegetables"], ["cucumber", "vegetables"], ["pumpkin", "vegetables"], ["okra", "vegetables"], ["beetroot", "vegetables"], ["zucchini", "vegetables"],

  // Legumes
  ["chickpea", "legumes"], ["lentil", "legumes"], ["pea", "legumes"], ["soybean", "legumes"], ["pigeon_pea", "legumes"], ["kidney_bean", "legumes"], ["black_gram", "legumes"], ["green_gram", "legumes"], ["cowpea", "legumes"], ["horse_gram", "legumes"],

  // Grains
  ["wheat", "grains"], ["rice", "grains"], ["corn", "grains"], ["barley", "grains"], ["oats", "grains"], ["sorghum", "grains"], ["millet", "grains"], ["quinoa", "grains"], ["rye", "grains"], ["bajra", "grains"], ["amaranth", "grains"],

  // Herbs
  ["mint", "herbs"], ["coriander", "herbs"], ["basil", "herbs"], ["parsley", "herbs"], ["rosemary", "herbs"], ["thyme", "herbs"], ["oregano", "herbs"], ["dill", "herbs"], ["lemongrass", "herbs"],

  // Flowers
  ["rose", "flowers"], ["lily", "flowers"], ["marigold", "flowers"], ["jasmine", "flowers"], ["hibiscus", "flowers"], ["lavender", "flowers"], ["chrysanthemum", "flowers"], ["tulip", "flowers"], ["lotus", "flowers"], ["gerbera", "flowers"],

  // Spices
  ["turmeric", "spices"], ["chili", "spices"], ["ginger", "spices"], ["cardamom", "spices"], ["cumin", "spices"], ["coriander_seed", "spices"], ["fennel", "spices"], ["mustard_seed", "spices"], ["fenugreek", "spices"],

  // Oilseeds
  ["sunflower_seed", "oilseeds"], ["sesame", "oilseeds"], ["groundnut", "oilseeds"], ["soybean", "oilseeds"], ["linseed", "oilseeds"],  ["mustard", "oilseeds"], ["castor", "oilseeds"],

  // Medicinal
  ["ashwagandha", "medicinal"], ["giloy", "medicinal"],

  // Others
  ["hara_chara", "others"], ["tooda", "others"],
]);

function normalizeText(str) {
  return str.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

export function guessCategoryFromName(name) {
  const text = normalizeText(name);
  for (const [keyword, category] of normalizedCategoryMap.entries()) {
    if (text.includes(keyword)) {
      return category;
    }
  }
  return "others";
}

export function createPromoLink(text, cropName, data) {
  const link = createElement("a", { href: "#", class: "promo-link" }, [text]);
  link.onclick = e => {
    e.preventDefault();
    const found = Object.values(data).flat().find(c =>
      c.name.toLowerCase() === cropName.toLowerCase()
    );
    found ? navigate(`/crop/${cropName.toLowerCase()}`) : alert(`Sorry, ${cropName} not found.`);
  };
  return link;
}
