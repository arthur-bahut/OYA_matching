export const state = {
  cardIndex: 0,
  swipeScores: {},       // { bloc: number }
  answers: [],           // [{ badge, statement, answer: 'yes'|'no'|'skip' }]

  romeFamily: null,      // lettre 'A'–'V'
  romeFamilyLabel: null,
  romeLibelle: null,

  yearsXp: null,         // string
  region: '',

  constraints: new Set(), // Set<string> (clés T3)
};

export function resetState() {
  state.cardIndex = 0;
  state.swipeScores = {};
  state.answers = [];
  state.romeFamily = null;
  state.romeFamilyLabel = null;
  state.romeLibelle = null;
  state.yearsXp = null;
  state.region = '';
  state.constraints = new Set();
}
