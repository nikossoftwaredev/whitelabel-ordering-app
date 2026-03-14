export const souvlakiShopPreset = {
  categories: [
    {
      name: "Souvlaki",
      nameEl: "Σουβλάκια",
      products: [
        { name: "Pita Gyros Pork", nameEl: "Πίτα Γύρος Χοιρινό", price: 350, description: "Pork gyros in pita with tomato, onion, tzatziki, and fries" },
        { name: "Pita Gyros Chicken", nameEl: "Πίτα Γύρος Κοτόπουλο", price: 350, description: "Chicken gyros in pita" },
        { name: "Kalamaki Pork", nameEl: "Καλαμάκι Χοιρινό", price: 250, description: "Pork skewer" },
        { name: "Kalamaki Chicken", nameEl: "Καλαμάκι Κοτόπουλο", price: 250, description: "Chicken skewer" },
        { name: "Pita Souvlaki Pork", nameEl: "Πίτα Σουβλάκι Χοιρινό", price: 320, description: "Pork souvlaki in pita" },
      ],
    },
    {
      name: "Plates",
      nameEl: "Μερίδες",
      products: [
        { name: "Gyros Plate Pork", nameEl: "Μερίδα Γύρος Χοιρινό", price: 900, description: "Pork gyros plate with fries, salad, and pita" },
        { name: "Gyros Plate Chicken", nameEl: "Μερίδα Γύρος Κοτόπουλο", price: 900, description: "Chicken gyros plate" },
        { name: "Mixed Grill", nameEl: "Μικτό Πιάτο", price: 1200, description: "Assorted grilled meats with sides" },
      ],
    },
    {
      name: "Salads",
      nameEl: "Σαλάτες",
      products: [
        { name: "Greek Salad", nameEl: "Χωριάτικη", price: 600, description: "Tomato, cucumber, feta, olives, onion", isVegetarian: true, isGlutenFree: true },
        { name: "Caesar Salad", nameEl: "Σαλάτα Σίζαρ", price: 700, description: "With chicken, croutons, parmesan" },
      ],
    },
    {
      name: "Sides",
      nameEl: "Συνοδευτικά",
      products: [
        { name: "French Fries", nameEl: "Πατάτες Τηγανιτές", price: 300, description: "Crispy fries", isVegan: true, isGlutenFree: true },
        { name: "Tzatziki", nameEl: "Τζατζίκι", price: 250, description: "Yogurt dip with cucumber", isVegetarian: true, isGlutenFree: true },
        { name: "Pita Bread", nameEl: "Πίτα", price: 100, description: "Warm pita bread", isVegan: true },
      ],
    },
    {
      name: "Drinks",
      nameEl: "Ποτά",
      products: [
        { name: "Coca-Cola", nameEl: "Κόκα-Κόλα", price: 200, description: "330ml can", isVegan: true },
        { name: "Water", nameEl: "Νερό", price: 50, description: "500ml bottle", isVegan: true },
        { name: "Sprite", nameEl: "Σπράιτ", price: 200, description: "330ml can", isVegan: true },
        { name: "Beer", nameEl: "Μπύρα", price: 350, description: "Local draft beer", isVegan: true },
      ],
    },
  ],
  modifierGroups: [
    {
      name: "Pita Extras",
      nameEl: "Υλικά Πίτας",
      required: false,
      minSelect: 0,
      maxSelect: 6,
      applyTo: ["Souvlaki"],
      options: [
        { name: "Tzatziki", nameEl: "Τζατζίκι", priceAdjustment: 0, isDefault: true },
        { name: "Tomato", nameEl: "Ντομάτα", priceAdjustment: 0, isDefault: true },
        { name: "Onion", nameEl: "Κρεμμύδι", priceAdjustment: 0, isDefault: true },
        { name: "Fries in Pita", nameEl: "Πατάτες στη Πίτα", priceAdjustment: 0, isDefault: true },
        { name: "Paprika", nameEl: "Πάπρικα", priceAdjustment: 0 },
        { name: "Mustard", nameEl: "Μουστάρδα", priceAdjustment: 0 },
      ],
    },
    {
      name: "Sauce",
      nameEl: "Σως",
      required: false,
      minSelect: 0,
      maxSelect: 2,
      applyTo: ["Souvlaki", "Plates"],
      options: [
        { name: "Tzatziki Sauce", nameEl: "Σως Τζατζίκι", priceAdjustment: 0 },
        { name: "Ketchup", nameEl: "Κέτσαπ", priceAdjustment: 0 },
        { name: "Mustard Sauce", nameEl: "Σως Μουστάρδα", priceAdjustment: 0 },
        { name: "Hot Sauce", nameEl: "Καυτερή Σως", priceAdjustment: 0 },
      ],
    },
    {
      name: "Size",
      nameEl: "Μέγεθος",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      applyTo: ["Plates"],
      options: [
        { name: "Regular", nameEl: "Κανονική", priceAdjustment: 0, isDefault: true },
        { name: "Large", nameEl: "Μεγάλη", priceAdjustment: 200 },
      ],
    },
  ],
};
