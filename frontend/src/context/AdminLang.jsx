import { createContext, useContext, useState } from 'react'

// Language of the admin panel (public pages have their own toggle). Remembered in this browser.
// Server error messages (the API's "detail" text) stay in English.
const TEXT = {
  // navbar / login
  'admin': ['Admin', 'Administravimas'],
  'logout': ['Log out', 'Atsijungti'],
  'login.title': ['Admin Login', 'Administratoriaus prisijungimas'],
  'login.username': ['Username', 'Vartotojo vardas'],
  'login.password': ['Password', 'Slaptažodis'],
  'login.submit': ['Sign in', 'Prisijungti'],
  'login.submitting': ['Signing in…', 'Jungiamasi…'],
  'login.error': ['Invalid username or password.', 'Neteisingas vartotojo vardas arba slaptažodis.'],
  // dashboard
  'loading': ['Loading…', 'Kraunama…'],
  'dash.title': ['Manage Recipes', 'Receptų valdymas'],
  'dash.import': ['Import from picture', 'Importuoti iš nuotraukos'],
  'dash.add': ['Add recipe manually', 'Pridėti receptą rankiniu būdu'],
  'dash.empty': ['No recipes yet. Add your first one!', 'Receptų dar nėra. Pridėkite pirmąjį!'],
  'dash.edit': ['Edit', 'Redaguoti'],
  'dash.delete': ['Delete', 'Ištrinti'],
  'dash.confirmDelete': ['Delete "{title}"?', 'Ištrinti „{title}“?'],
  // import dialog
  'imp.title': ['Import from picture', 'Importuoti iš nuotraukos'],
  'imp.close': ['Close', 'Uždaryti'],
  'imp.addPhotos': ['+ Add recipe photos', '+ Pridėti recepto nuotraukų'],
  'imp.reading': ['Reading…', 'Skaitoma…'],
  'imp.readMany': ['Read text from {n} photos', 'Nuskaityti tekstą iš {n} nuotraukų'],
  'imp.readOne': ['Read text from photo', 'Nuskaityti tekstą iš nuotraukos'],
  'imp.up': ['Move up', 'Perkelti aukštyn'],
  'imp.down': ['Move down', 'Perkelti žemyn'],
  'imp.remove': ['Remove', 'Pašalinti'],
  'imp.hint': ['Recipe spans several pages? Add all photos in page order.', 'Receptas keliuose puslapiuose? Pridėkite visas nuotraukas puslapių tvarka.'],
  'imp.placeholder': ['The text from your photos appears here. Check it and fix any mistakes — or paste recipe text directly.', 'Čia atsiras tekstas iš jūsų nuotraukų. Patikrinkite ir ištaisykite klaidas arba tiesiog įklijuokite recepto tekstą.'],
  'imp.cancel': ['Cancel', 'Atšaukti'],
  'imp.importing': ['Importing…', 'Importuojama…'],
  'imp.submit': ['Import recipe', 'Importuoti receptą'],
  'imp.readError': ['Could not read the photos.', 'Nepavyko nuskaityti nuotraukų.'],
  'imp.failed': ['Import failed.', 'Importas nepavyko.'],
  // recipe form
  'form.edit': ['Edit Recipe', 'Redaguoti receptą'],
  'form.new': ['New Recipe', 'Naujas receptas'],
  'form.basic': ['Basic Info', 'Pagrindinė informacija'],
  'form.titleLt': ['Title (Lithuanian)', 'Pavadinimas (lietuviškai)'],
  'form.titleEn': ['Title (English)', 'Pavadinimas (angliškai)'],
  'form.descLt': ['Description (Lithuanian)', 'Aprašymas (lietuviškai)'],
  'form.ingredients': ['Ingredients', 'Ingredientai'],
  'form.amount': ['Amount', 'Kiekis'],
  'form.qty': ['Qty', 'Kiek.'],
  'form.unit': ['Unit', 'Mato vnt.'],
  'form.lt': ['Lithuanian', 'Lietuviškai'],
  'form.en': ['English', 'Angliškai'],
  'form.addIngredient': ['+ Add ingredient', '+ Pridėti ingredientą'],
  'form.steps': ['Steps', 'Žingsniai'],
  'form.addStep': ['+ Add step', '+ Pridėti žingsnį'],
  'form.nutrition': ['Nutrition (per serving)', 'Maistinė vertė (1 porcijai)'],
  'form.servings': ['Servings (recipe yields)', 'Porcijų skaičius'],
  'form.estimating': ['Estimating…', 'Skaičiuojama…'],
  'form.estimate': ['Estimate from ingredients', 'Apskaičiuoti pagal ingredientus'],
  'form.estimateHint': ['Estimated from a nutrition table (per serving) — please review and adjust before saving.', 'Apskaičiuota pagal maistinės vertės lentelę (1 porcijai) – prieš išsaugodami patikrinkite ir pataisykite.'],
  'form.addFirst': ['Add some ingredients first.', 'Pirmiausia pridėkite ingredientų.'],
  'form.notCounted': ['Not counted (unknown ingredient or amount): {list}', 'Neįskaičiuota (nežinomas ingredientas arba kiekis): {list}'],
  'form.estimateFailed': ['Could not estimate nutrition.', 'Nepavyko apskaičiuoti maistinės vertės.'],
  'form.calories': ['Calories (kcal)', 'Kalorijos (kcal)'],
  'form.protein': ['Protein (g)', 'Baltymai (g)'],
  'form.weight': ['Serving weight (g)', 'Porcijos svoris (g)'],
  'form.photo': ['Photo', 'Nuotrauka'],
  'form.changePhoto': ['Click to change photo', 'Spustelėkite nuotraukai pakeisti'],
  'form.uploadPhoto': ['Click to upload photo (JPG, PNG, WebP)', 'Spustelėkite norėdami įkelti nuotrauką (JPG, PNG, WebP)'],
  'form.wrong': ['Something went wrong.', 'Kažkas nepavyko.'],
  'form.cancel': ['Cancel', 'Atšaukti'],
  'form.saving': ['Saving…', 'Saugoma…'],
  'form.save': ['Save Changes', 'Išsaugoti pakeitimus'],
  'form.create': ['Create Recipe', 'Sukurti receptą'],
}

const AdminLangContext = createContext(null)

export function AdminLangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('adminLang') === 'lt' ? 'lt' : 'en' } catch { return 'en' }
  })

  const setLang = (l) => {
    setLangState(l)
    try { localStorage.setItem('adminLang', l) } catch { /* ignore */ }
  }

  const t = (key, vars = {}) => {
    const entry = TEXT[key]
    const text = entry ? entry[lang === 'lt' ? 1 : 0] : key
    return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))
  }

  return <AdminLangContext.Provider value={{ lang, setLang, t }}>{children}</AdminLangContext.Provider>
}

export function useAdminLang() {
  return useContext(AdminLangContext)
}
