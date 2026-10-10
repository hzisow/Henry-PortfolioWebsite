/* =========================================================================
   Rapid transit map data — an original schematic drawn after the MBTA
   rapid transit map (same lines, colours, stations and topology; laid out
   by hand on a 45° grid). Units are arbitrary map units.

   segments: each is one stretch of track drawn as a single stroke.
     pts: [x, y] is a bend, [x, y, 'id'] is a station on the track.
   stations: id -> [name, labelSide, options]
     labelSide: l r t b tl tr bl br, or 'rot' (45°, reading toward the stop)
     options: { lines: [...] } multi-line label, { dx, dy } nudges,
              { end: true } terminus (bold).
   ========================================================================= */
window.TMAP = {
  lines: {
    red:      { name: 'Red Line',      color: '#DA291C', width: 8 },
    mattapan: { name: 'Mattapan Line', color: '#DA291C', width: 5 },
    orange:   { name: 'Orange Line',   color: '#ED8B00', width: 8 },
    green:    { name: 'Green Line',    color: '#00843D', width: 8 },
    blue:     { name: 'Blue Line',     color: '#003DA5', width: 8 },
    silver:   { name: 'Silver Line',   color: '#7C878E', width: 5 }
  },

  bounds: { x: 110, y: 160, w: 1250, h: 1180 },

  segments: [
    /* ---- Red Line ---- */
    { line: 'red', pts: [
      [380, 460, 'alewife'], [420, 500, 'davis'], [460, 540, 'porter'], [500, 580, 'harvard'],
      [540, 620, 'central'], [580, 660, 'kendall'], [680, 760, 'charles'], [700, 780],
      [780, 780, 'park'], [850, 780, 'dtx'], [880, 780], [920, 820, 'southstation'], [940, 840],
      [940, 880, 'broadway'], [940, 925, 'andrew'], [940, 970, 'jfk']
    ] },
    { line: 'red', pts: [
      [940, 970, 'jfk'], [940, 1015, 'savinhill'], [940, 1060, 'fieldscorner'],
      [940, 1105, 'shawmut'], [940, 1150, 'ashmont']
    ] },
    { line: 'red', pts: [
      [940, 970, 'jfk'], [980, 1010, 'northquincy'], [1015, 1045, 'wollaston'],
      [1050, 1080, 'quincycenter'], [1085, 1115, 'quincyadams'], [1120, 1150, 'braintree']
    ] },
    { line: 'mattapan', pts: [
      [940, 1150, 'ashmont'], [920, 1170, 'cedargrove'], [900, 1190, 'butler'], [880, 1210, 'milton'],
      [860, 1230, 'centralave'], [840, 1250, 'valleyrd'], [820, 1270, 'capenst'], [800, 1290, 'mattapan']
    ] },

    /* ---- Orange Line ---- */
    { line: 'orange', pts: [
      [850, 200, 'oakgrove'], [850, 240, 'malden'], [850, 280, 'wellington'], [850, 320, 'assembly'],
      [850, 360, 'sullivan'], [850, 400, 'communitycollege'], [850, 508, 'northstation'],
      [850, 590, 'haymarket'], [850, 710, 'state'], [850, 780, 'dtx'], [850, 825, 'chinatown'],
      [850, 865, 'tufts'], [850, 880], [820, 910, 'backbay'], [790, 940, 'massave'],
      [760, 970, 'ruggles'], [730, 1000, 'roxbury'], [700, 1030, 'jackson'], [670, 1060, 'stonybrook'],
      [640, 1090, 'greenst'], [610, 1120, 'foresthills']
    ] },

    /* ---- Green Line ---- */
    { line: 'green', pts: [
      [770, 240, 'medfordtufts'], [770, 275, 'ballsq'], [770, 310, 'magounsq'], [770, 345, 'gilmansq'],
      [770, 380, 'eastsomerville'], [770, 420, 'lechmere'], [770, 430], [798, 458, 'sciencepark'],
      [834, 494], [834, 508, 'northstation'], [834, 590, 'haymarket'], [834, 604], [780, 658],
      [780, 710, 'govcenter'], [780, 780, 'park'], [780, 812, 'boylston'], [780, 840],
      [745, 840, 'arlington'], [700, 840, 'copley'], [650, 840, 'hynes'], [600, 840, 'kenmore']
    ] },
    { line: 'green', pts: [[770, 420, 'lechmere'], [715, 420, 'unionsq']] },
    { line: 'green', branch: 'B', pts: [
      [600, 840, 'kenmore'], [575, 840, 'blandford'], [550, 840, 'bueast'], [525, 840, 'bucentral'],
      [500, 840, 'amory'], [475, 840, 'babcock'], [450, 840, 'packards'], [425, 840, 'harvardave'],
      [400, 840, 'griggs'], [375, 840, 'allston'], [350, 840, 'warren'], [325, 840, 'washingtonst'],
      [300, 840, 'sutherland'], [275, 840, 'chiswick'], [250, 840, 'chestnuthillave'],
      [225, 840, 'southst'], [200, 840, 'bostoncollege']
    ] },
    { line: 'green', branch: 'C', pts: [
      [600, 840, 'kenmore'], [585, 840], [570, 855, 'stmarys'], [555, 870, 'hawes'], [540, 885, 'kent'],
      [525, 900, 'stpaul'], [510, 915, 'coolidge'], [495, 930, 'summit'], [480, 945, 'brandonhall'],
      [465, 960, 'fairbanks'], [450, 975, 'washingtonsq'], [435, 990, 'tappan'], [420, 1005, 'deanrd'],
      [405, 1020, 'englewood'], [390, 1035, 'clevelandcircle']
    ] },
    { line: 'green', branch: 'D', pts: [
      [600, 840, 'kenmore'], [600, 865, 'fenway'], [600, 890, 'longwood'], [600, 915, 'brooklinevillage'],
      [600, 925], [580, 945, 'brooklinehills'], [560, 965, 'beaconsfield'], [540, 985, 'reservoir'],
      [520, 1005, 'chestnuthill'], [500, 1025, 'newtoncentre'], [480, 1045, 'newtonhighlands'],
      [460, 1065, 'eliot'], [440, 1085, 'waban'], [420, 1105, 'woodland'], [400, 1125, 'riverside']
    ] },
    { line: 'green', branch: 'E', pts: [
      [700, 840, 'copley'], [700, 865, 'prudential'], [700, 890, 'symphony'], [700, 900],
      [680, 920, 'northeastern'], [660, 940, 'mfa'], [640, 960, 'lma'], [620, 980, 'brigham'],
      [600, 1000, 'fenwood'], [580, 1020, 'missionpark'], [560, 1040, 'riverway'],
      [540, 1060, 'backofthehill'], [520, 1080, 'heathst']
    ] },

    /* ---- Blue Line ---- */
    { line: 'blue', pts: [
      [725, 710, 'bowdoin'], [780, 710, 'govcenter'], [850, 710, 'state'], [905, 710, 'aquarium'],
      [920, 710], [960, 670, 'maverick'], [1000, 630, 'airport'], [1040, 590, 'woodisland'],
      [1080, 550, 'orientheights'], [1115, 515, 'suffolkdowns'], [1150, 480, 'beachmont'],
      [1185, 445, 'reverebeach'], [1220, 410, 'wonderland']
    ] },

    /* ---- Silver Line (Waterfront) ---- */
    { line: 'silver', pts: [
      [920, 820, 'southstation'], [970, 820, 'courthouse'], [1030, 820, 'wtc'], [1090, 820, 'silverlineway']
    ] },
    { line: 'silver', pts: [[1090, 820, 'silverlineway'], [1125, 785], [1165, 745, 'logan']] },
    { line: 'silver', pts: [[1090, 820, 'silverlineway'], [1125, 855], [1125, 880, 'designcenter']] },
    { line: 'silver', pts: [
      [1090, 820, 'silverlineway'], [1125, 785], [1000, 660], [1000, 630, 'airport'],
      [1000, 600, 'easternave'], [1000, 570, 'boxdistrict'], [1000, 540, 'bellingham'], [1000, 510, 'chelsea']
    ] }
  ],

  stations: {
    /* Red */
    alewife: ['Alewife', 'l', { end: true }],
    davis: ['Davis', 'l'],
    porter: ['Porter', 'l'],
    harvard: ['Harvard', 'l'],
    central: ['Central', 'l'],
    kendall: ['Kendall/MIT', 'l'],
    charles: ['Charles/MGH', 'l'],
    park: ['Park Street', 'tl'],
    dtx: ['Downtown Crossing', 'tr', { lines: ['Downtown', 'Crossing'] }],
    southstation: ['South Station', 'tr'],
    broadway: ['Broadway', 'r'],
    andrew: ['Andrew', 'r'],
    jfk: ['JFK/UMass', 'r', { dy: -3 }],
    savinhill: ['Savin Hill', 'l'],
    fieldscorner: ['Fields Corner', 'l'],
    shawmut: ['Shawmut', 'l'],
    ashmont: ['Ashmont', 'tl', { end: true }],
    northquincy: ['North Quincy', 'r'],
    wollaston: ['Wollaston', 'r'],
    quincycenter: ['Quincy Center', 'r'],
    quincyadams: ['Quincy Adams', 'r'],
    braintree: ['Braintree', 'r', { end: true }],
    cedargrove: ['Cedar Grove', 'l'],
    butler: ['Butler', 'l'],
    milton: ['Milton', 'l'],
    centralave: ['Central Avenue', 'l'],
    valleyrd: ['Valley Road', 'l'],
    capenst: ['Capen Street', 'l'],
    mattapan: ['Mattapan', 'l', { end: true }],

    /* Orange */
    oakgrove: ['Oak Grove', 'r', { end: true }],
    malden: ['Malden Center', 'r'],
    wellington: ['Wellington', 'r'],
    assembly: ['Assembly', 'r'],
    sullivan: ['Sullivan Square', 'r'],
    communitycollege: ['Community College', 'r'],
    northstation: ['North Station', 'r'],
    haymarket: ['Haymarket', 'r'],
    state: ['State', 'tr'],
    chinatown: ['Chinatown', 'r'],
    tufts: ['Tufts Medical Center', 'r', { lines: ['Tufts Medical', 'Center'] }],
    backbay: ['Back Bay', 'r'],
    massave: ['Massachusetts Avenue', 'r'],
    ruggles: ['Ruggles', 'r'],
    roxbury: ['Roxbury Crossing', 'r'],
    jackson: ['Jackson Square', 'r'],
    stonybrook: ['Stony Brook', 'r'],
    greenst: ['Green Street', 'r'],
    foresthills: ['Forest Hills', 'r', { end: true }],

    /* Green */
    medfordtufts: ['Medford/Tufts', 'l', { end: true }],
    ballsq: ['Ball Square', 'l'],
    magounsq: ['Magoun Square', 'l'],
    gilmansq: ['Gilman Square', 'l'],
    eastsomerville: ['East Somerville', 'l'],
    lechmere: ['Lechmere', 'r'],
    unionsq: ['Union Square', 'l', { end: true }],
    sciencepark: ['Science Park/West End', 'l'],
    govcenter: ['Government Center', 'tl', { lines: ['Government', 'Center'] }],
    boylston: ['Boylston', 'r'],
    arlington: ['Arlington', 'b'],
    copley: ['Copley', 't'],
    hynes: ['Hynes Convention Center', 'rot'],
    kenmore: ['Kenmore', 'rot'],
    blandford: ['Blandford Street', 'rot'],
    bueast: ['Boston University East', 'rot'],
    bucentral: ['Boston University Central', 'rot'],
    amory: ['Amory Street', 'rot'],
    babcock: ['Babcock Street', 'rot'],
    packards: ["Packard's Corner", 'rot'],
    harvardave: ['Harvard Avenue', 'rot'],
    griggs: ['Griggs Street', 'rot'],
    allston: ['Allston Street', 'rot'],
    warren: ['Warren Street', 'rot'],
    washingtonst: ['Washington Street', 'rot'],
    sutherland: ['Sutherland Road', 'rot'],
    chiswick: ['Chiswick Road', 'rot'],
    chestnuthillave: ['Chestnut Hill Avenue', 'rot'],
    southst: ['South Street', 'rot'],
    bostoncollege: ['Boston College', 'rot', { end: true }],
    stmarys: ["Saint Mary's Street", 'l'],
    hawes: ['Hawes Street', 'l'],
    kent: ['Kent Street', 'l'],
    stpaul: ['Saint Paul Street', 'l'],
    coolidge: ['Coolidge Corner', 'l'],
    summit: ['Summit Avenue', 'l'],
    brandonhall: ['Brandon Hall', 'l'],
    fairbanks: ['Fairbanks Street', 'l'],
    washingtonsq: ['Washington Square', 'l'],
    tappan: ['Tappan Street', 'l'],
    deanrd: ['Dean Road', 'l'],
    englewood: ['Englewood Avenue', 'l'],
    clevelandcircle: ['Cleveland Circle', 'l', { end: true }],
    fenway: ['Fenway', 'r'],
    longwood: ['Longwood', 'r'],
    brooklinevillage: ['Brookline Village', 'r', { lines: ['Brookline', 'Village'] }],
    brooklinehills: ['Brookline Hills', 'l'],
    beaconsfield: ['Beaconsfield', 'l'],
    reservoir: ['Reservoir', 'l'],
    chestnuthill: ['Chestnut Hill', 'l'],
    newtoncentre: ['Newton Centre', 'l'],
    newtonhighlands: ['Newton Highlands', 'l'],
    eliot: ['Eliot', 'l'],
    waban: ['Waban', 'l'],
    woodland: ['Woodland', 'l'],
    riverside: ['Riverside', 'l', { end: true }],
    prudential: ['Prudential', 'r'],
    symphony: ['Symphony', 'r'],
    northeastern: ['Northeastern University', 'r'],
    mfa: ['Museum of Fine Arts', 'r'],
    lma: ['Longwood Medical Area', 'r'],
    brigham: ['Brigham Circle', 'r'],
    fenwood: ['Fenwood Road', 'r'],
    missionpark: ['Mission Park', 'r'],
    riverway: ['Riverway', 'r'],
    backofthehill: ['Back of the Hill', 'r'],
    heathst: ['Heath Street', 'r', { end: true }],

    /* Blue */
    bowdoin: ['Bowdoin', 'b', { end: true }],
    aquarium: ['Aquarium', 'b'],
    maverick: ['Maverick', 'r'],
    airport: ['Airport', 'r'],
    woodisland: ['Wood Island', 'r'],
    orientheights: ['Orient Heights', 'r'],
    suffolkdowns: ['Suffolk Downs', 'r'],
    beachmont: ['Beachmont', 'r'],
    reverebeach: ['Revere Beach', 'r'],
    wonderland: ['Wonderland', 'r', { end: true }],

    /* Silver */
    courthouse: ['Courthouse', 'b'],
    wtc: ['World Trade Center', 'b', { lines: ['World Trade', 'Center'] }],
    silverlineway: ['Silver Line Way', 'tl', { dx: -2 }],
    logan: ['Logan Airport', 'r', { end: true }],
    designcenter: ['Design Center', 'r', { end: true }],
    easternave: ['Eastern Avenue', 'l'],
    boxdistrict: ['Box District', 'l'],
    bellingham: ['Bellingham Square', 'l'],
    chelsea: ['Chelsea', 'l', { end: true }]
  },

  /* Coloured name tabs and branch letters, like the ones on the real map. */
  tabs: [
    { line: 'red', text: 'RED LINE', x: 380, y: 432 },
    { line: 'red', text: 'RED LINE', x: 1120, y: 1174 },
    { line: 'orange', text: 'ORANGE LINE', x: 850, y: 176 },
    { line: 'green', text: 'GREEN LINE', x: 770, y: 216 },
    { line: 'blue', text: 'BLUE LINE', x: 1220, y: 386 },
    { line: 'silver', text: 'SILVER LINE', x: 1150, y: 904 },
    { line: 'mattapan', text: 'MATTAPAN', x: 800, y: 1314 }
  ],
  branches: [
    { text: 'B', x: 200, y: 862 },
    { text: 'C', x: 380, y: 1054 },
    { text: 'D', x: 392, y: 1145 },
    { text: 'E', x: 528, y: 1101 }
  ],

  /* Water and parks, drawn first. Rivers are thick strokes; the bay is a fill. */
  water: {
    strokes: [
      { w: 24, d: 'M30 812 L240 806 Q360 798 460 782 Q540 766 585 738 Q620 716 650 692 Q685 650 705 610 L742 528' },
      { w: 12, d: 'M742 528 Q756 496 768 470 Q776 454 784 444 Q796 436 812 440 Q832 444 850 452 L870 462' },
      { w: 40, d: 'M868 462 Q900 480 914 502 Q930 530 930 560 L928 640 Q928 680 934 702 Q944 736 958 752 Q976 776 1004 784 Q1050 792 1100 792 L1360 786' },
      { w: 8, d: 'M942 760 Q948 790 950 808 L954 846' }
    ],
    fills: [
      'M1170 832 L1360 818 L1360 1345 L1285 1345 L1190 1180 L1110 1100 L1052 1042 L1003 993 L978 952 L992 918 L1070 902 L1150 884 Z'
    ],
    labels: [
      { text: 'Charles River', x: 712, y: 590, r: -64 },
      { text: 'Boston Harbor', x: 1240, y: 980, r: 0 }
    ]
  },
  parks: [
    { x: 712, y: 790, w: 58, h: 42, label: 'Boston Common' }
  ]
};
