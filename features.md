Commit and push these changes. Update readme so know how to run this.

Now some features that requires you to first go into planning then you can execute one at a time, with both FE & BE being updated. 
I review commit and push after:
- I want a sync button for whatever is pulling from csroi.  So That goes for Deals and Cases in the top of it. Cant do that for Steam of course. I assume that was the refresh button does for Deals as well?
- For all items I want a sync button that pulls newest data for each item.  That requieres that also build the CSFloat endpoint We dont have the csfloat endpoint setup right ? or do we ?  I would need to configure API_key somewhere, so consider that. You would likely need to look at documentation. WE should be able to search for items by name, wear and preferably float so the price is for the nearest higher-float item, OR just minimum price if csfloat api allows for that. I want to know for every item when they were last synced and if it was from CSROI or markets(csfloat + steam). So like there is item tracker from when they were added, it should replace that. This should be available both on markets and in the items part of it.  I would like the sync button in the ui to be between the delete(trash logo). I want a sync button for item groups as well, but should keep to the strict rate limits 1 rq per 3 seconds but I think that is already enforced in clients/steam.py, but when sync all it should just go slowly down while spinning and doing one at a time. If I ever hit "You've made too many requests recently. Please wait and try your request again later." I need to be notified of that !
- Minor deals prices need to be in eur not usd in deals. ALso we have both steam eur and low eur, so how do you get that price? Lets just have  one field.
- We need to have a safety measure so we are sure we dont hit the steam api too often, should be handled in backend and give an error if I try to sync when it is being reached. Set it conservatively. If I go for sync all button for all 
- Have item groups, I need CRUD for that.
- Rework Scenario (more components is coming later), but make a pane called case openings for now where I can add a case openings with name + date. Add in items (you can use the items steam +csfloat ). What will be there is Item. Also need sync all here ofc.
But What I need here is: Items | Wear | Float |CSFOAT PRICE | Steam Price | Steam Net | ROI CSFLOAT | ROI STEAM | ROI CSFloat Multiplied. These are for each field, and should be summarized in top. Make this as table as well same look as the other tables. 
There should be a Cases sum (that is a count of all items, I shouldnt be able to change that that changes everytime I update an item). I need a field where I write Case + key price in top that determines how ROIs are calculated, as well as a multiplier field.

Steam net is calculated as Steam Price/1.15
CSFloat Roi is calculated as (sum of all CSFLOAT price items*0.98)/(Case+key price), with 0.98 being the CSFloat sell fee. 
ROI Steam is calculated as Steam Net/(Cases opened*Case + key price)

Case + key price is probably just lets name that something else Like Unbox Price.
Lastly ROI CSFLoat multiplied is calculated as ROI CSFLOAT*Multiplier.


This is a little over the place, but go into planning figure out how to build these components, how the order should be and where/if/how in FE and BE. Break it down, so we make incremental changes that support one business logic.