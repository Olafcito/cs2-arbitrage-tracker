## NExt
- Add price history for all items so everytime I sync this is extending "db" with records if that make sense and if it isnt already done in backend. I would like to be able to view price history on items, of course items have varying float values, but I can in dashboard view item price history (updated at sync), or slice for example on skin and wear. Like all actions happening I wanna be able to track, also sales and purchases and such when we get there over time. 
- Add total cases to Case Open scenarios, and how many I have used/how many I have in total.
- Fix the inventory sync there has already been 2 rq
- In Frontend Multiplier should be green < 1.4 < orange > 1.3 Red
- Steam inventory doesnt pull all lof it, perhaps only tradeable items? BUt I do know that I am missing a bunch of items, including all of my cases. I dont know if there is pagenation or limits or what not. Steam_login_secure: Your Steam login cookie for fetching your own inventory WITHOUT the 10-day trade block. When provided, `steam_id` is ignored. Find this cookie in your browser dev tools under "steamLoginSecure". This might fix! with_no_tradable=1 could also. https://www.steamwebapi.com/api/steam/documentation#get-/steam/api/inventory

- The USD/Eur thing doesnt work it doesnt change it from euro to US when I click it around. Expected behaviour:
    - Values are changed from Euro TO USD. We replace EUR from all column names because we have Euro signs in the text. I dont know if we need to dos some structural changes if the prices are written in currency in our actual data? Like then we might have to change the datamodels/schema for that. Could be complicated we do have the exchange rate endpoint, but we get steam prices in eur and CSF in USD..
- Add "autocomplete" feature, so of all Items I have I can just tab-click like in many websites. When I type in M (there come all items with M), MA (all items with MA), MAC, bla bla you get it. 
- Unittest for all endpoints. Tests for all frontend components.


---

## Backlog (planned, ordered easiest → hardest)

### 1. Multiplier color thresholds
Update `multiplierClass()` in `frontend/src/utils/format.ts` and `multiplierColor()` in `CaseOpeningDetail.tsx`:
- `>= 1.4` → green
- `1.3–1.4` → orange
- `< 1.3` → red

### 2. Steam inventory: fetch all items including non-tradeable
Pass `with_no_tradable: 1` in the inventory API call. Add `STEAM_LOGIN_SECURE` env var support — when set, use cookie auth (bypasses 10-day restriction) instead of `steam_id`. Files: `src/services/inventory.py`, `src/config.py`, `.env.sample`.

### 3. USD/EUR toggle fix
Many components call `fmt.eur(value)` directly instead of `fmt.cur(convert(value, rate), symbol)`, so the toggle changes the symbol but not the values. Audit all price-displaying pages (Deals, Cases, Scenarios, CaseOpeningDetail, CaseOpenings) and replace hardcoded `fmt.eur()` with the currency-aware pattern.

### 4. Autocomplete for item name inputs
Build a reusable `Combobox` component in `frontend/src/components/ui/Combobox.tsx` (filtered dropdown, keyboard nav). Apply to the case opening add-item modal and `AddItemForm`. New backend endpoint `GET /case-openings/item-names` returns deduplicated sorted item names across all sessions.

### 5. Total cases field per session
Add `total_cases: int | None` to `CaseOpening` model and `CaseOpeningPatch`. Inline-editable in session detail header. Shows `{opened} / {total}` in stat cards and list view.

### 6. Price history per item at each sync
New `PriceEvent` model (`synced_at`, `csf_price_eur`, `steam_price_eur`). Add `price_history: list[PriceEvent]` to `CaseOpeningItem`. `sync_item()` appends a record on every sync. Frontend: history icon per row opens a modal table of price records over time.

### 7. Unit tests
Backend: `tests/unit/test_case_openings.py` covering ROI math, sync freeze, status history, sale price logic. Frontend: set up vitest + React Testing Library, test `format.ts` utilities and the Combobox component.

---

## Big features

- Look into the calculations for openings, do that in relations to scenario when we have the bigger calculations
- Refactor scenarios when we get there still WIP and serves mostly as a placeholder
    - I need to have all of those like key prices nad money spent and such.

- Build database.
- Groups is WIP, 
- Add cache to frontend
- Add selling




## Refacotring
- I was told FastAPI was designed from the ground up to favor functions. While you can use Class-Based Views (CBV), the framework’s core feature—Dependency Injection—is built around the Depends() function. Please tell me why, educated me and pro /cons of each.
- Add Steam_net to backend and retrieve that in the frontend do not do the calculation there.
- Calculations in top of case openings: I wanna know how this is calculated and where. Seems to be calculated by _compute_rois, I wonder if this should be done in frontend or backend? I think this is a little entertangled as well with the local file savngs, so that might be refactored when database is added.
- Theres some interdependencies for CSFloat listings, both fest listings and fetch listings data I think one would be sufficient. Seems params is mostly related to get those filterings, we should be able to just do that directly from get_listigs and then call that from sync_item

- Refactor out the market hash names. I want an utils that generates a market hash name from Weapon name + Condition + ST(If) 
- The idx in case opens should be refactored, instead we do different type of search or something. Perhaps this will be changed when we make a database. Would make it easier to use the swagger links.
- Add more informative error handling.
- Put all endpoints under items instead.
    - So we have one items instead, and the items pane can be called washlist where I can just add/remove items. Then we have scnearios 

    Maybes: - Make async IF Needed