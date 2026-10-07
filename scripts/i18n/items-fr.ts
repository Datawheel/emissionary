import { frTypo, type ItemText } from './types';

/** French item text. Notes use plain spaces; frTypo() applies French typography. */
const RAW: ItemText = {
  electric_kettle: {
    name: 'Bouilloire électrique',
    note: 'Porter 1 L d’eau à 20 °C à ébullition demande 0,093 kWh de chaleur ; une bouilloire à résistance immergée transmet ~85 % de son électricité à l’eau (fourchette 80–90 %).',
  },
  induction_hob: {
    name: 'Plaque à induction (ébullition)',
    note: 'Rendement de cuisson par induction ~84 % (programme ENERGY STAR des tables de cuisson à induction résidentielles).',
  },
  electric_hob: {
    name: 'Plaque électrique à résistance (ébullition)',
    note: 'Rendement de cuisson d’une plaque électrique à résistance ~74 % (document technique du DOE américain sur les appareils de cuisson résidentiels).',
  },
  gas_hob: {
    name: 'Plaque de cuisson au gaz (ébullition)',
    note: 'Rendement de cuisson d’une plaque au gaz ~40 % (DOE américain, base PCS) × facteur de combustion du gaz naturel 182,6 gCO₂/kWh PCS (DESNZ 2025, CO₂ seul). Identique dans tous les pays.',
  },
  refrigerator: {
    name: 'Réfrigérateur',
    note: 'Le réfrigérateur certifié médian consomme 345 kWh/an (n = 4 659, base ENERGY STAR), soit ≈ 39,4 W en moyenne sur l’année, cycles du compresseur compris.',
  },
  chest_freezer: {
    name: 'Congélateur',
    note: 'Le congélateur certifié médian consomme 405 kWh/an (n = 659, base ENERGY STAR), soit ≈ 46,2 W en moyenne sur l’année.',
  },
  dishwasher: {
    name: 'Lave-vaisselle',
    note: 'Lave-vaisselle certifié médian : 239 kWh/an sur la base fédérale de 215 cycles ≈ 1,11 kWh par cycle (n = 736, base ENERGY STAR), chauffage de l’eau compris.',
    event: { one: 'cycle', other: 'cycles' },
  },
  microwave: {
    name: 'Four à micro-ondes',
    note: 'Un micro-ondes de comptoir typique consomme ~1 100 W en chauffe (puissance nominale de la catégorie, fourchette 900–1 500 W). En attente de vérification sur données certifiées.',
  },
  electric_oven: {
    name: 'Four électrique',
    note: 'Un four électrique à ~200 °C consomme en moyenne ~2,0 kWh par heure d’utilisation, cycles de la résistance compris (convention de la catégorie). En attente de vérification sur données certifiées.',
  },
  gas_oven: {
    name: 'Four à gaz',
    note: 'Un four à gaz à ~200 °C brûle ~3,0 kWh de gaz par heure d’utilisation (énergie thermique, cycles du brûleur compris ; convention de la catégorie). Identique dans tous les pays.',
  },
  espresso_machine: {
    name: 'Machine à expresso',
    note: 'Un expresso ≈ 0,02 kWh : chauffer ~40 mL d’eau, plus les pertes de la chaudière (estimation physique ; fourchette 0,01–0,05 kWh). En attente de vérification par mesure.',
    event: { one: 'expresso', other: 'expressos' },
  },
  toaster: {
    name: 'Grille-pain',
    note: 'Grille-pain 2 tranches typique : ~1 000 W (fourchette de la catégorie 800–1 500 W). En attente de vérification sur données certifiées.',
  },
  air_fryer: {
    name: 'Friteuse sans huile',
    note: 'Friteuse sans huile typique : ~1 500 W ; les cycles de la résistance abaissent un peu la moyenne (fourchette de la catégorie 1 200–1 800 W). En attente de vérification.',
  },
  room_ac: {
    name: 'Climatiseur (pièce)',
    note: 'Le climatiseur de pièce certifié médian de 10–14k BTU consomme ~800 W en refroidissement (n = 226, capacité ÷ CEER, base ENERGY STAR).',
  },
  space_heater: {
    name: 'Radiateur électrique d’appoint',
    note: 'Les radiateurs portables à résistance font 1 500 W en Amérique du Nord (2 000 W typiques en Europe) ; le chauffage par résistance est efficace à 100 % à la prise.',
  },
  heat_pump: {
    name: 'Pompe à chaleur (chauffage)',
    note: 'Une pompe à chaleur qui fournit ~2,8 kW de chaleur avec un COP saisonnier de ~3,5 consomme ~800 W d’électricité — environ 0,29 kWh d’électricité par kWh de chaleur. En attente de vérification.',
  },
  gas_boiler: {
    name: 'Chaudière à gaz (chauffage)',
    note: 'Une chaudière à gaz domestique en chauffe brûle ~12 kW de gaz (énergie thermique ; plage de modulation 8–24 kW). Identique dans tous les pays. En attente de vérification.',
  },
  ceiling_fan: {
    name: 'Ventilateur de plafond',
    note: 'Le ventilateur de plafond certifié médian consomme 29,8 W à grande vitesse (n = 1 384, base ENERGY STAR).',
  },
  dehumidifier: {
    name: 'Déshumidificateur',
    note: 'Déshumidificateur certifié médian : 343 kWh/an sur la base d’essai de 1 095 heures ≈ 313 W en fonctionnement (n = 523, base ENERGY STAR).',
  },
  electric_blanket: {
    name: 'Couverture chauffante',
    note: 'Couverture chauffante double typique : ~150 W au maximum (fourchette de la catégorie 60–200 W). En attente de vérification.',
  },
  hairdryer: {
    name: 'Sèche-cheveux',
    note: 'Sèche-cheveux grand public typique, au maximum : ~1 800 W (fourchette de la catégorie 1 200–2 200 W). En attente de vérification sur données certifiées.',
  },
  electric_shower: {
    name: 'Douche (chauffe-eau électrique)',
    note: 'Une douche alimentée par un chauffe-eau électrique instantané consomme ~9,5 kW tant que l’eau coule (fourchette de la catégorie 7,5–10,5 kW).',
  },
  hair_straightener: {
    name: 'Lisseur à cheveux',
    note: 'Les lisseurs consomment en moyenne ~120 W une fois chauds (fourchette 40–300 W). En attente de vérification.',
  },
  electric_toothbrush: {
    name: 'Brosse à dents électrique',
    note: 'Une recharge complète d’une batterie de brosse à dents de ~1,4 Wh, plus les pertes du chargeur ≈ 0,002 kWh — presque négligeable, et c’est justement le propos.',
    event: { one: 'recharge', other: 'recharges' },
  },
  washing_machine: {
    name: 'Lave-linge',
    note: 'Lave-linge certifié médian : 110 kWh/an sur la base d’étiquetage de 234 lavages ≈ 0,47 kWh par lavage à l’eau tiède (n = 393, base ENERGY STAR ; les modèles certifiés sont plus efficaces que la moyenne).',
    event: { one: 'lavage', other: 'lavages' },
  },
  tumble_dryer: {
    name: 'Sèche-linge',
    note: 'Sèche-linge électrique certifié médian : 608 kWh/an sur la base d’essai de 283 séchages ≈ 2,15 kWh par séchage (n = 644, base ENERGY STAR).',
    event: { one: 'séchage', other: 'séchages' },
  },
  iron: {
    name: 'Fer à repasser',
    note: 'Fer à repasser à vapeur typique : ~1 400 W ; le thermostat abaisse la moyenne (fourchette 1 000–1 800 W). En attente de vérification.',
  },
  vacuum_cleaner: {
    name: 'Aspirateur',
    note: 'Les aspirateurs filaires consomment ~1 200 W (fourchette 500–1 800 W ; l’écoconception de l’UE plafonne à 900 W). En attente de vérification.',
  },
  tv_55: {
    name: 'Téléviseur LED 55″',
    note: 'Téléviseur certifié médian de 53–57″ : 97,5 W en marche selon la procédure d’essai fédérale (n = 30, base ENERGY STAR).',
  },
  desktop_monitor: {
    name: 'Écran d’ordinateur',
    note: 'L’écran certifié médian consomme 28,7 W en marche (n = 2 789, base ENERGY STAR).',
  },
  laptop: {
    name: 'Ordinateur portable',
    note: 'Un ordinateur portable typique en usage actif consomme ~50 W (fourchette 20–100 W selon la charge). En attente de vérification.',
  },
  gaming_pc: {
    name: 'PC de jeu',
    note: 'Un PC de jeu milieu à haut de gamme en pleine partie consomme ~350 W, écran non compris (fourchette 200–600 W). En attente de vérification par mesure.',
  },
  game_console: {
    name: 'Console de jeux',
    note: 'Les consoles de la génération actuelle consomment ~160 W en jeu (fourchette 70–220 W). En attente de vérification par mesure.',
  },
  smartphone_charge: {
    name: 'Smartphone (recharge)',
    note: 'Une recharge complète d’une batterie de smartphone de ~13 Wh avec un chargeur efficace à ~85 % ≈ 0,015 kWh.',
    event: { one: 'recharge', other: 'recharges' },
  },
  tablet_charge: {
    name: 'Tablette (recharge)',
    note: 'Une recharge complète d’une batterie de tablette de ~28 Wh avec un chargeur efficace à ~85 % ≈ 0,033 kWh.',
    event: { one: 'recharge', other: 'recharges' },
  },
  wifi_router: {
    name: 'Routeur Wi-Fi',
    note: 'Les routeurs Wi-Fi domestiques consomment ~8 W en continu (fourchette 5–20 W). En attente de vérification.',
  },
  led_bulb: {
    name: 'Ampoule LED de 800 lumens',
    note: 'Une LED de 800 lumens (la lumière d’une ampoule à incandescence classique de 60 W) consomme ~9 W (guide d’éclairage DOE Energy Saver, fourchette 8–10 W).',
  },
  led_bulb_1600: {
    name: 'Ampoule LED de 1600 lumens',
    note: 'Une LED puissante de 1600 lumens (classe équivalente à 100 W) consomme ~16 W (guide d’éclairage DOE Energy Saver, fourchette 14–20 W).',
  },
  incandescent_bulb: {
    name: 'Ampoule à incandescence de 800 lumens',
    note: 'La classique ampoule à incandescence de 60 W produit ~800 lumens — la même lumière qu’une LED de 9 W, avec 6–7× plus d’énergie.',
  },
  incandescent_bulb_1600: {
    name: 'Ampoule à incandescence de 1600 lumens',
    note: 'Une ampoule à incandescence de 100 W produit ~1600 lumens — la même lumière qu’une LED de 16 W.',
  },
  smart_speaker: {
    name: 'Enceinte connectée',
    note: 'Les enceintes connectées consomment ~3 W en veille ou en lecture (fourchette 1,5–6 W). En attente de vérification par mesure.',
  },
  ereader_charge: {
    name: 'Liseuse (recharge)',
    note: 'Une recharge complète d’une batterie de liseuse de ~5 Wh avec un chargeur efficace à ~85 % ≈ 0,006 kWh — des semaines de lecture.',
    event: { one: 'recharge', other: 'recharges' },
  },
  petrol_car: {
    name: 'Voiture essence',
    note: 'Utilise la moyenne nationale de CO₂ par km des voitures en circulation lorsqu’elle est vérifiée (voir le tableau de conversion) ; valeur mondiale par défaut 160 g/km ≈ la voiture essence moyenne en circulation au Royaume-Uni (DESNZ 2025).',
  },
  diesel_car: {
    name: 'Voiture diesel',
    note: 'Voiture diesel moyenne en circulation : 171,4 gCO₂/km (DESNZ 2025, CO₂ seul, parc britannique — utilisé partout comme valeur représentative).',
  },
  ev_car: {
    name: 'Voiture électrique',
    note: 'Valeur EPA combinée de la voiture électrique la plus vendue (Tesla Model Y LR AWD 2024) : 28,7 kWh/100 mi de la prise aux roues ≈ 0,178 kWh/km, pertes de recharge comprises.',
  },
  motor_scooter: {
    name: 'Scooter',
    note: 'Petite moto (≤125 cm³) : 80,9 gCO₂/km (DESNZ 2025, CO₂ seul).',
  },
  city_bus: {
    name: 'Bus urbain (par passager)',
    note: 'Bus urbain moyen transportant sa charge moyenne de ~12,7 passagers : 103,1 gCO₂ par passager-km, CO₂ seul (DESNZ 2025 / statistiques DfT sur les bus). Un bus plus rempli émet moins par personne.',
  },
  coach: {
    name: 'Autocar interurbain (par passager)',
    note: 'Autocar interurbain transportant sa charge moyenne de ~17,6 passagers : 27,3 gCO₂ par passager-km, CO₂ seul (DESNZ 2025) — l’un des modes de transport motorisé les plus propres.',
  },
  train_national: {
    name: 'Train (par passager)',
    note: 'Moyenne du rail national : 35,1 gCO₂ par passager-km, CO₂ seul — toute l’énergie du réseau (trains électriques + diesel) divisée par l’ensemble des passagers-km à fréquentation habituelle (DESNZ 2025 ; les réseaux entièrement électrifiés diffèrent).',
  },
  flight_short_haul: {
    name: 'Vol court-courrier (par passager)',
    note: 'Vol court-courrier en classe économique avec ~83 % des sièges occupés (moyenne de flotte, CAA 2023) : 73,4 gCO₂ par passager-km, CO₂ seul, hors forçage radiatif (DESNZ 2025 ; avec le forçage radiatif, l’impact climatique double environ).',
  },
  e_bike: {
    name: 'Vélo électrique',
    note: 'Une batterie de vélo électrique de ~0,5 kWh permet ~45 km d’assistance ≈ 0,011 kWh/km, pertes de recharge comprises. En attente de vérification par mesure.',
  },
};

export const ITEMS_FR: ItemText = Object.fromEntries(
  Object.entries(RAW).map(([id, v]) => [id, { ...v, note: frTypo(v.note) }]),
);
