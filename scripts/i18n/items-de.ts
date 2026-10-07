import type { ItemText } from './types';

/**
 * German item text. Names are chosen to start with a noun (they keep their
 * capitalization inside sentences: "10 Min. Haartrockner").
 */
export const ITEMS_DE: ItemText = {
  electric_kettle: {
    name: 'Wasserkocher',
    note: 'Um 1 L Wasser von 20 °C zum Kochen zu bringen, braucht es 0,093 kWh Wärme; ein Wasserkocher mit eingetauchtem Heizelement gibt ~85 % seines Stroms an das Wasser ab (Spanne 80–90 %).',
  },
  induction_hob: {
    name: 'Induktionskochfeld (Wasser kochen)',
    note: 'Wirkungsgrad beim Kochen mit Induktion ~84 % (ENERGY-STAR-Programm für Induktionskochfelder im Haushalt).',
  },
  electric_hob: {
    name: 'Elektrokochfeld mit Heizspirale (Wasser kochen)',
    note: 'Wirkungsgrad eines Elektrokochfelds mit Heizspirale ~74 % (Technical Support Document des US-Energieministeriums zu Haushaltskochgeräten).',
  },
  gas_hob: {
    name: 'Gaskochfeld (Wasser kochen)',
    note: 'Wirkungsgrad eines Gaskochfelds ~40 % (US-Energieministerium, Brennwertbasis) × Verbrennungsfaktor von Erdgas 182,6 gCO₂/kWh (Brennwert; DESNZ 2025, nur CO₂). In jedem Land gleich.',
  },
  refrigerator: {
    name: 'Kühlschrank',
    note: 'Der zertifizierte Median-Kühlschrank verbraucht 345 kWh/Jahr (n = 4.659, ENERGY-STAR-Datensatz) ≈ 39,4 W im Jahresmittel, einschließlich der Taktung des Kompressors.',
  },
  chest_freezer: {
    name: 'Gefriergerät',
    note: 'Das zertifizierte Median-Gefriergerät verbraucht 405 kWh/Jahr (n = 659, ENERGY-STAR-Datensatz) ≈ 46,2 W im Jahresmittel.',
  },
  dishwasher: {
    name: 'Geschirrspüler',
    note: 'Zertifizierter Median-Geschirrspüler: 239 kWh/Jahr bei der US-Prüfbasis von 215 Spülgängen ≈ 1,11 kWh pro Spülgang (n = 736, ENERGY-STAR-Datensatz), Wassererwärmung inbegriffen.',
    event: { one: 'Spülgang', other: 'Spülgänge' },
  },
  microwave: {
    name: 'Mikrowelle',
    note: 'Eine typische Tisch-Mikrowelle zieht beim Erhitzen ~1.100 W (Nennaufnahme der Produktklasse, Spanne 900–1.500 W). Überprüfung anhand zertifizierter Daten ausstehend.',
  },
  electric_oven: {
    name: 'Elektrobackofen',
    note: 'Ein Elektrobackofen bei ~200 °C verbraucht im Schnitt ~2,0 kWh pro Betriebsstunde, Takten des Heizelements inbegriffen (Konvention der Produktklasse). Überprüfung anhand zertifizierter Daten ausstehend.',
  },
  gas_oven: {
    name: 'Gasbackofen',
    note: 'Ein Gasbackofen bei ~200 °C verbrennt ~3,0 kWh Gas pro Betriebsstunde (thermisch, Takten des Brenners inbegriffen; Konvention der Produktklasse). In jedem Land gleich.',
  },
  espresso_machine: {
    name: 'Espressomaschine',
    note: 'Ein Espresso ≈ 0,02 kWh: ~40 mL Brühwasser erhitzen plus Verluste des Boilers (physikalische Schätzung; Spanne 0,01–0,05 kWh). Überprüfung durch Messung ausstehend.',
    event: { one: 'Espresso', other: 'Espressi' },
  },
  toaster: {
    name: 'Toaster',
    note: 'Typischer Toaster für 2 Scheiben mit ~1.000 W (Spanne der Produktklasse 800–1.500 W). Überprüfung anhand zertifizierter Daten ausstehend.',
  },
  air_fryer: {
    name: 'Heißluftfritteuse',
    note: 'Typische Heißluftfritteuse mit ~1.500 W; das Takten des Heizelements senkt den Durchschnitt leicht (Spanne der Produktklasse 1.200–1.800 W). Überprüfung ausstehend.',
  },
  room_ac: {
    name: 'Klimagerät (Raum)',
    note: 'Das zertifizierte Median-Raumklimagerät mit 10–14k BTU zieht beim Kühlen ~800 W (n = 226, Kühlleistung ÷ CEER, ENERGY-STAR-Datensatz).',
  },
  space_heater: {
    name: 'Elektroheizgerät',
    note: 'Tragbare Elektroheizgeräte haben in Nordamerika 1.500 W (in Europa typischerweise 2.000 W); Widerstandsheizung wandelt den Strom aus der Steckdose zu 100 % in Wärme um.',
  },
  heat_pump: {
    name: 'Wärmepumpe (Heizen)',
    note: 'Eine Wärmepumpe, die ~2,8 kW Wärme bei einer Jahresarbeitszahl (COP) von ~3,5 liefert, zieht ~800 W Strom – etwa 0,29 kWh Strom pro kWh Wärme. Überprüfung ausstehend.',
  },
  gas_boiler: {
    name: 'Gastherme (Heizen)',
    note: 'Eine Gastherme im Haushalt verbrennt beim Heizen ~12 kW Gas (thermisch; Modulationsbereich 8–24 kW). In jedem Land gleich. Überprüfung ausstehend.',
  },
  ceiling_fan: {
    name: 'Deckenventilator',
    note: 'Der zertifizierte Median-Deckenventilator zieht 29,8 W auf höchster Stufe (n = 1.384, ENERGY-STAR-Datensatz).',
  },
  dehumidifier: {
    name: 'Luftentfeuchter',
    note: 'Zertifizierter Median-Luftentfeuchter: 343 kWh/Jahr bei der Prüfbasis von 1.095 Stunden ≈ 313 W im Betrieb (n = 523, ENERGY-STAR-Datensatz).',
  },
  electric_blanket: {
    name: 'Heizdecke',
    note: 'Typische Doppel-Heizdecke mit ~150 W auf höchster Stufe (Spanne der Produktklasse 60–200 W). Überprüfung ausstehend.',
  },
  hairdryer: {
    name: 'Haartrockner',
    note: 'Typischer Haartrockner auf höchster Stufe: ~1.800 W (Spanne der Produktklasse 1.200–2.200 W). Überprüfung anhand zertifizierter Daten ausstehend.',
  },
  electric_shower: {
    name: 'Dusche (elektrischer Durchlauferhitzer)',
    note: 'Eine Dusche mit elektrischem Durchlauferhitzer zieht ~9,5 kW, solange das Wasser fließt (Spanne der Produktklasse 7,5–10,5 kW).',
  },
  hair_straightener: {
    name: 'Glätteisen',
    note: 'Glätteisen ziehen im Schnitt ~120 W, sobald sie aufgeheizt sind (Spanne 40–300 W). Überprüfung ausstehend.',
  },
  electric_toothbrush: {
    name: 'Elektrozahnbürste',
    note: 'Eine volle Ladung eines Zahnbürsten-Akkus mit ~1,4 Wh plus Ladeverluste ≈ 0,002 kWh – fast vernachlässigbar, und genau darum geht es.',
    event: { one: 'Ladung', other: 'Ladungen' },
  },
  washing_machine: {
    name: 'Waschmaschine',
    note: 'Zertifizierte Median-Waschmaschine: 110 kWh/Jahr bei der Label-Basis von 234 Waschgängen ≈ 0,47 kWh pro Waschgang mit warmem Wasser (n = 393, ENERGY-STAR-Datensatz; zertifizierte Geräte sind effizienter als der Durchschnitt).',
    event: { one: 'Waschgang', other: 'Waschgänge' },
  },
  tumble_dryer: {
    name: 'Wäschetrockner',
    note: 'Zertifizierter Median-Elektrotrockner: 608 kWh/Jahr bei der Prüfbasis von 283 Trockengängen ≈ 2,15 kWh pro Trockengang (n = 644, ENERGY-STAR-Datensatz).',
    event: { one: 'Trockengang', other: 'Trockengänge' },
  },
  iron: {
    name: 'Bügeleisen',
    note: 'Typisches Dampfbügeleisen mit ~1.400 W; der Thermostat senkt den Durchschnitt (Spanne 1.000–1.800 W). Überprüfung ausstehend.',
  },
  vacuum_cleaner: {
    name: 'Staubsauger',
    note: 'Staubsauger mit Kabel ziehen ~1.200 W (Spanne 500–1.800 W; die EU-Ökodesign-Verordnung begrenzt auf 900 W). Überprüfung ausstehend.',
  },
  tv_55: {
    name: 'LED-Fernseher 55″',
    note: 'Zertifizierter Median-Fernseher mit 53–57″: 97,5 W im Betrieb nach dem US-Prüfverfahren (n = 30, ENERGY-STAR-Datensatz).',
  },
  desktop_monitor: {
    name: 'Computermonitor',
    note: 'Der zertifizierte Median-Monitor zieht im Betrieb 28,7 W (n = 2.789, ENERGY-STAR-Datensatz).',
  },
  laptop: {
    name: 'Laptop',
    note: 'Ein typischer Laptop zieht bei aktiver Nutzung ~50 W (Spanne 20–100 W je nach Last). Überprüfung ausstehend.',
  },
  gaming_pc: {
    name: 'Gaming-PC',
    note: 'Ein Gaming-Desktop der Mittel- bis Oberklasse zieht beim Spielen ~350 W, ohne Monitor (Spanne 200–600 W). Überprüfung durch Messung ausstehend.',
  },
  game_console: {
    name: 'Spielkonsole',
    note: 'Konsolen der aktuellen Generation ziehen beim Spielen ~160 W (Spanne 70–220 W). Überprüfung durch Messung ausstehend.',
  },
  smartphone_charge: {
    name: 'Smartphone-Akku',
    note: 'Eine volle Ladung eines Smartphone-Akkus mit ~13 Wh bei ~85 % Ladewirkungsgrad ≈ 0,015 kWh.',
    event: { one: 'Ladung', other: 'Ladungen' },
  },
  tablet_charge: {
    name: 'Tablet-Akku',
    note: 'Eine volle Ladung eines Tablet-Akkus mit ~28 Wh bei ~85 % Ladewirkungsgrad ≈ 0,033 kWh.',
    event: { one: 'Ladung', other: 'Ladungen' },
  },
  wifi_router: {
    name: 'WLAN-Router',
    note: 'WLAN-Router im Haushalt ziehen dauerhaft ~8 W (Spanne 5–20 W). Überprüfung ausstehend.',
  },
  led_bulb: {
    name: 'LED-Lampe mit 800 Lumen',
    note: 'Eine LED mit 800 Lumen (so hell wie eine klassische 60-W-Glühbirne) zieht ~9 W (Beleuchtungsleitfaden von DOE Energy Saver, Spanne 8–10 W).',
  },
  led_bulb_1600: {
    name: 'LED-Lampe mit 1600 Lumen',
    note: 'Eine helle LED mit 1600 Lumen (Klasse entsprechend 100 W) zieht ~16 W (Beleuchtungsleitfaden von DOE Energy Saver, Spanne 14–20 W).',
  },
  incandescent_bulb: {
    name: 'Glühbirne mit 800 Lumen',
    note: 'Die klassische 60-W-Glühbirne liefert ~800 Lumen – dasselbe Licht wie eine 9-W-LED, aber mit dem 6–7-Fachen an Energie.',
  },
  incandescent_bulb_1600: {
    name: 'Glühbirne mit 1600 Lumen',
    note: 'Eine 100-W-Glühbirne liefert ~1600 Lumen – dasselbe Licht wie eine 16-W-LED.',
  },
  smart_speaker: {
    name: 'Smart Speaker',
    note: 'Smart Speaker ziehen im Ruhezustand bzw. bei Wiedergabe ~3 W (Spanne 1,5–6 W). Überprüfung durch Messung ausstehend.',
  },
  ereader_charge: {
    name: 'E-Reader-Akku',
    note: 'Eine volle Ladung eines E-Reader-Akkus mit ~5 Wh bei ~85 % Ladewirkungsgrad ≈ 0,006 kWh – das reicht für wochenlanges Lesen.',
    event: { one: 'Ladung', other: 'Ladungen' },
  },
  petrol_car: {
    name: 'Benzinauto',
    note: 'Verwendet den durchschnittlichen CO₂-Ausstoß pro km der Autos im Straßenverkehr deines Landes, sofern verifiziert (siehe Umrechnungstabelle); globaler Ersatzwert 160 g/km ≈ das durchschnittliche Benzinauto im britischen Straßenverkehr (DESNZ 2025).',
  },
  diesel_car: {
    name: 'Dieselauto',
    note: 'Durchschnittliches Dieselauto im Straßenverkehr: 171,4 gCO₂/km (DESNZ 2025, nur CO₂, britischer Fahrzeugbestand – überall als repräsentativer Wert verwendet).',
  },
  ev_car: {
    name: 'Elektroauto',
    note: 'Kombinierter EPA-Wert des meistverkauften Elektroautos (Tesla Model Y LR AWD 2024): 28,7 kWh/100 mi von der Steckdose bis zum Rad ≈ 0,178 kWh/km, Ladeverluste inbegriffen.',
  },
  motor_scooter: {
    name: 'Motorroller',
    note: 'Kleines Motorrad (≤125 cm³): 80,9 gCO₂/km (DESNZ 2025, nur CO₂).',
  },
  city_bus: {
    name: 'Stadtbus (pro Person)',
    note: 'Durchschnittlicher Linienbus mit seiner mittleren Auslastung von ~12,7 Fahrgästen: 103,1 gCO₂ pro Personenkilometer, nur CO₂ (DESNZ 2025 / DfT-Busstatistik). Ein vollerer Bus verursacht pro Person weniger.',
  },
  coach: {
    name: 'Fernbus (pro Person)',
    note: 'Fernbus mit seiner mittleren Auslastung von ~17,6 Fahrgästen: 27,3 gCO₂ pro Personenkilometer, nur CO₂ (DESNZ 2025) – eine der saubersten motorisierten Reisearten.',
  },
  train_national: {
    name: 'Zug (pro Person)',
    note: 'Durchschnitt der nationalen Bahn: 35,1 gCO₂ pro Personenkilometer, nur CO₂ – die gesamte Energie des Netzes (Elektro- und Dieselzüge) geteilt durch alle Personenkilometer bei üblicher Auslastung (DESNZ 2025; vollständig elektrifizierte Netze weichen ab).',
  },
  flight_short_haul: {
    name: 'Kurzstreckenflug (pro Person)',
    note: 'Kurzstreckenflug in der Economy Class mit ~83 % belegten Sitzen (Flottendurchschnitt, CAA 2023): 73,4 gCO₂ pro Personenkilometer, nur CO₂, ohne Strahlungsantrieb (DESNZ 2025; mit Strahlungsantrieb verdoppelt sich die Klimawirkung etwa).',
  },
  e_bike: {
    name: 'E-Bike',
    note: 'Ein E-Bike-Akku mit ~0,5 kWh reicht für ~45 km mit Unterstützung ≈ 0,011 kWh/km, Ladeverluste inbegriffen. Überprüfung durch Messung ausstehend.',
  },
};
