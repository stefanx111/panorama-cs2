"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="iteminfo.ts" />
/// <reference path="../generated/items_event_current_generated_store.d.ts" />
/// <reference path="../generated/items_event_current_generated_store.ts" />
var StoreItems;
(function (StoreItems) {
    let m_oItemsByCategory = {
        coupon: [],
        tournament: [],
        prime: [],
        market: [],
        key: [],
        store: []
    };
    function MakeStoreItemList() {
        let count = StoreAPI.GetBannerEntryCount();
        if (!count || count < 1) {
            return;
        }
        m_oItemsByCategory = {
            coupon: [],
            tournament: [],
            prime: [],
            market: [],
            key: [],
            store: []
        };
        let isPerfectWorld = (MyPersonaAPI.GetLauncherType() === "perfectworld");
        let strBannerEntryCustomFormatString;
        for (var i = 0; i < count; i++) {
            let ItemId = StoreAPI.GetBannerEntryDefIdx(i);
            let FauxItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(ItemId, 0);
            if (!isPerfectWorld &&
                InventoryAPI.IsTool(FauxItemId) &&
                (InventoryAPI.GetItemCapabilityByIndex(FauxItemId, 0) === 'decodable')) {
                m_oItemsByCategory.key.push({ id: FauxItemId });
            }
            else if (StoreAPI.IsBannerEntryMarketLink(i) === true) {
                m_oItemsByCategory.market.push({ id: FauxItemId, isMarketItem: true });
            }
            else if ((strBannerEntryCustomFormatString = StoreAPI.GetBannerEntryCustomFormatString(i)).startsWith("coupon")) {
                if (!AllowDisplayingItemInStore(FauxItemId))
                    continue;
                let sLinkedCoupon = StoreAPI.GetBannerEntryLinkedCoupon(i);
                if (sLinkedCoupon) {
                    let LinkedItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(parseInt(sLinkedCoupon), 0);
                    m_oItemsByCategory.coupon.push({ id: FauxItemId, linkedid: LinkedItemId });
                }
                else if (strBannerEntryCustomFormatString === "coupon_new") {
                    m_oItemsByCategory.coupon.push({ id: FauxItemId, activationType: 'newstore', isNewRelease: true });
                }
                else {
                    m_oItemsByCategory.coupon.push({ id: FauxItemId });
                }
            }
            else {
                if (!AllowDisplayingItemInStore(FauxItemId))
                    continue;
                m_oItemsByCategory.store.push({ id: FauxItemId });
            }
        }
        GetTournamentItems();
    }
    StoreItems.MakeStoreItemList = MakeStoreItemList;
    function AllowDisplayingItemInStore(FauxItemId) {
        var idToCheckForRestrictions = FauxItemId;
        var bIsCouponCrate = InventoryAPI.IsCouponCrate(idToCheckForRestrictions);
        if (bIsCouponCrate && ItemInfo.GetLootListCount(idToCheckForRestrictions) > 0) {
            idToCheckForRestrictions = InventoryAPI.GetLootListItemIdByIndex(idToCheckForRestrictions, 0);
        }
        var sDefinitionName = InventoryAPI.GetItemDefinitionName(idToCheckForRestrictions);
        if (sDefinitionName === "crate_stattrak_swap_tool")
            return true;
        var bIsDecodable = ItemInfo.ItemHasCapability(idToCheckForRestrictions, 'decodable');
        var sRestriction = bIsDecodable ? InventoryAPI.GetDecodeableRestriction(idToCheckForRestrictions) : null;
        if (sRestriction === "restricted" || sRestriction === "xray") {
            return false;
        }
        return true;
    }
    function GetStoreItems() {
        return m_oItemsByCategory;
    }
    StoreItems.GetStoreItems = GetStoreItems;
    function GetStoreItemData(type, idx) {
        return m_oItemsByCategory[type][idx];
    }
    StoreItems.GetStoreItemData = GetStoreItemData;
    function GetTournamentItems() {
        var sRestriction = InventoryAPI.GetDecodeableRestriction("capsule");
        var bCanSellCapsules = (sRestriction !== "restricted" && sRestriction !== "xray");
        for (let i = 0; i < g_ActiveTournamentStoreLayout.length; i++) {
            if (!bCanSellCapsules && (i >= g_ActiveTournamentInfo.num_global_offerings)) {
                return;
            }
            let bContainsJustChampions = (typeof g_ActiveTournamentStoreLayout[i][1] === 'string');
            let FauxItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(g_ActiveTournamentStoreLayout[i][0], 0);
            let GroupName = g_ActiveTournamentStoreLayout[i][2] ? g_ActiveTournamentStoreLayout[i][2] : '';
            let warning = warningTextTournamentItems(isPurchaseable(FauxItemId), FauxItemId);
            if (ItemInfo.GetStoreSalePrice(FauxItemId, 1)) {
                let storeItem = {
                    id: FauxItemId,
                    useTinyNames: true
                };
                if (isPurchaseable(FauxItemId)) {
                    storeItem.isNotReleased = true;
                }
                if (!bContainsJustChampions) {
                    storeItem.linkedid = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(g_ActiveTournamentStoreLayout[i][1], 0);
                }
                if (GroupName) {
                    storeItem.groupName != GroupName;
                }
                if (warning) {
                    storeItem.linkedWarning = warning;
                }
                m_oItemsByCategory.tournament?.push(storeItem);
            }
        }
    }
    function warningTextTournamentItems(isPurchaseable, itemid) {
        return !isPurchaseable ?
            '#tournament_items_not_released' : InventoryAPI.GetItemTypeFromEnum(itemid) === 'type_tool' ?
            '#tournament_items_notice' : '';
    }
    function isPurchaseable(itemid) {
        var schemaString = InventoryAPI.BuildItemSchemaDefJSON(itemid);
        if (!schemaString)
            return false;
        var itemSchemaDef = JSON.parse(schemaString);
        return itemSchemaDef["cannot_inspect"] === 1 ? false : true;
    }
    ;
})(StoreItems || (StoreItems = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVfaXRlbXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yZV9pdGVtcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLG9DQUFvQztBQUNwQyw4RUFBOEU7QUFDOUUsNEVBQTRFO0FBb0I1RSxJQUFVLFVBQVUsQ0FzTW5CO0FBdE1ELFdBQVUsVUFBVTtJQUluQixJQUFJLGtCQUFrQixHQUFzQjtRQUMzQyxNQUFNLEVBQUUsRUFBRTtRQUNWLFVBQVUsRUFBRSxFQUFFO1FBQ2QsS0FBSyxFQUFFLEVBQUU7UUFDVCxNQUFNLEVBQUUsRUFBRTtRQUNWLEdBQUcsRUFBRSxFQUFFO1FBQ1AsS0FBSyxFQUFFLEVBQUU7S0FDVCxDQUFDO0lBRUYsU0FBZ0IsaUJBQWlCO1FBRWhDLElBQUksS0FBSyxHQUFXLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRW5ELElBQUssQ0FBQyxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFDeEI7WUFDQyxPQUFPO1NBQ1A7UUFFRCxrQkFBa0IsR0FBRztZQUNwQixNQUFNLEVBQUUsRUFBRTtZQUNWLFVBQVUsRUFBRSxFQUFFO1lBQ2QsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsRUFBRTtZQUNWLEdBQUcsRUFBRSxFQUFFO1lBQ1AsS0FBSyxFQUFFLEVBQUU7U0FDVCxDQUFDO1FBRUYsSUFBSSxjQUFjLEdBQUcsQ0FBRSxZQUFZLENBQUMsZUFBZSxFQUFFLEtBQUssY0FBYyxDQUFFLENBQUM7UUFDM0UsSUFBSSxnQ0FBd0MsQ0FBQztRQUU3QyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUMvQjtZQUNDLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUNoRCxJQUFJLFVBQVUsR0FBVyxZQUFZLENBQUMsaUNBQWlDLENBQUUsTUFBTSxFQUFFLENB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