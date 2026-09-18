export const businesses = {
  cafe: {
    id: 'cafe',
    name: 'Northstar Café',
    type: 'Café',
    phone: '+92 300 0000000',
    location: 'Main Boulevard, Karachi',
    hours: 'Monday to Sunday, 8 AM to 11 PM',
    services: ['dine-in', 'takeaway', 'delivery', 'table reservations'],
    highlights: ['specialty coffee', 'breakfast', 'desserts', 'free Wi-Fi'],
    prices: 'Most drinks are PKR 450–850 and meals are PKR 700–1,500.',
    booking: 'I can record your name, preferred time and number of guests for confirmation by staff.',
    fallback: 'I can help with timings, menu, prices, location, delivery and reservations.'
  },
  restaurant: {
    id: 'restaurant',
    name: 'Saffron Table',
    type: 'Restaurant',
    phone: '+92 300 0000001',
    location: 'Clifton, Karachi',
    hours: 'Daily, 12 PM to 12 AM',
    services: ['dine-in', 'takeaway', 'delivery', 'event bookings'],
    highlights: ['Pakistani cuisine', 'BBQ platters', 'family seating', 'private events'],
    prices: 'A typical meal costs PKR 1,200–2,500 per person.',
    booking: 'Share your name, date, time and party size. Our team will confirm availability.',
    fallback: 'I can help with the menu, reservations, family seating, delivery and event bookings.'
  },
  realestate: {
    id: 'realestate',
    name: 'Vertex Homes',
    type: 'Real Estate',
    phone: '+92 300 0000002',
    location: 'Shahrah-e-Faisal, Karachi',
    hours: 'Monday to Saturday, 9 AM to 7 PM',
    services: ['buying', 'renting', 'selling', 'property viewings'],
    highlights: ['apartments', 'houses', 'commercial units', 'verified listings'],
    prices: 'Pricing depends on area, property type and size. I can qualify your budget for an agent.',
    booking: 'Tell me your preferred area, budget and viewing time. An agent will confirm the appointment.',
    fallback: 'I can help shortlist property by area, budget, bedrooms and buying or rental preference.'
  }
};

export function getBusiness(id = 'cafe') {
  return businesses[id] || businesses.cafe;
}
