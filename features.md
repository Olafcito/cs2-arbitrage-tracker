## Personal
- Figure out how I ended up with 7 extra cases. See how many cases was sold on steam market, see how many was purchased





## NExt
- Add total cases to Case Open scenarios, and how many I have used/how many I have in total.
- Fix the inventory sync there has already been 2 rq
- In Frontend Multiplier should be green < 1.4 < orange > 1.3 Red
- Add ability to sell, when solid price should be fixed, and not updated as sync. Perhaps move to scenarios at given price.
- Steam inventory doesnt pull all lof it, perhaps only tradeable items? BUt I do know that I am missing a bunch of items, including all of my cases. I dont know if there is pagenation or limits or what not. Steam_login_secure: Your Steam login cookie for fetching your own inventory WITHOUT the 10-day trade block. When provided, `steam_id` is ignored. Find this cookie in your browser dev tools under "steamLoginSecure". This might fix! with_no_tradable=1 could also. https://www.steamwebapi.com/api/steam/documentation#get-/steam/api/inventory

- The USD/Eur thing doesnt work it doesnt change it from euro to US when I click it around. Expected behaviour:
    - Values are changed from Euro TO USD. We replace EUR from all column names because we have Euro signs in the text. I dont know if we need to dos some structural changes if the prices are written in currency in our actual data? Like then we might have to change the datamodels/schema for that. Could be complicated we do have the exchange rate endpoint, but we get steam prices in eur and CSF in USD..
- See if I can get a repository of all steam names that are available, perhaps cached in frontend. One issue that would solve would be for example some have capitalized names like MAC-10 not Mac-10 so when I start typing I get a "recommendation". 
- Remove the cutting down of values in backend, only do so in f/e




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

- Unittest for all endpoints
    Maybes: - Make async IF Needed