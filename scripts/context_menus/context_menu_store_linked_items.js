"use strict";
/// <reference path="../itemtile_store.ts" />
var StoreLinkedItems;
(function (StoreLinkedItems) {
    function Init() {
        const itemId = $.GetContextPanel().GetAttributeString("itemids", "");
        const isNotReleased = $.GetContextPanel().GetAttributeString("is-not-released", "") !== "true" ? false : true;
        const aItemIds = itemId.split(',');
        let elItem = null;
        for (var i = 0; i < aItemIds.length; i++) {
            elItem = $.CreatePanel("Button", $.GetContextPanel().FindChildInLayoutFile('id-store-linked-items-images'), aItemIds[i]);
            elItem.BLoadLayout('file://{resources}/layout/itemtile_store.xml', false, false);
            let oItemData = {
                id: aItemIds[i],
                isNotReleased: isNotReleased,
                isDisabled: isNotReleased
            };
            ItemTileStore.Init(elItem, oItemData);
        }
        _ShowWarningText();
    }
    StoreLinkedItems.Init = Init;
    function _ShowWarningText() {
        var warningText = $.GetContextPanel().GetAttributeString("linkedWarning", "");
        if (warningText) {
            $.GetContextPanel().SetHasClass('hidewarning', false);
            $.GetContextPanel().SetDialogVariable('warning', $.Localize(warningText));
        }
        else {
            $.GetContextPanel().SetHasClass('hidewarning', true);
        }
    }
})(StoreLinkedItems || (StoreLinkedItems = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dF9tZW51X3N0b3JlX2xpbmtlZF9pdGVtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRleHRfbWVudV9zdG9yZV9saW5rZWRfaXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDZDQUE2QztBQUU3QyxJQUFVLGdCQUFnQixDQTJDekI7QUEzQ0QsV0FBVSxnQkFBZ0I7SUFHekIsU0FBZ0IsSUFBSTtRQUVuQixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ3ZFLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxpQkFBaUIsRUFBRSxFQUFFLENBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2hILE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFHbkMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBRWxCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUN4QztZQUNDLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMscUJBQXFCLENBQUUsOEJBQThCLENBQUUsRUFBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLENBQWMsQ0FBQztZQUMzSSxNQUFNLENBQUMsV0FBVyxDQUFFLDhDQUE4QyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUUsQ0FBQztZQUVuRixJQUFJLFNBQVMsR0FBZTtnQkFDM0IsRUFBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUU7Z0JBQ2pCLGFBQWEsRUFBRSxhQUFhO2dCQUM1QixVQUFVLEVBQUUsYUFBYTthQUN6QixDQUFBO1lBQ0QsYUFBYSxDQUFDLElBQUksQ0FBRSxNQUFNLEVBQUUsU0FBUyxDQUFFLENBQUM7U0FDeEM7UUFFRCxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUF2QmUscUJBQUksT0F1Qm5CLENBQUE7SUFFRCxTQUFTLGdCQUFnQjtRQUV4QixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsZUFBZSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBRWhGLElBQUssV0FBVyxFQUNoQjtZQUNDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxXQUFXLENBQUUsYUFBYSxFQUFFLEtBQUssQ0FBRSxDQUFDO1lBQ3hELENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxXQUFXLENBQUUsQ0FBQyxDQUFDO1NBQzdFO2FBRUQ7WUFDQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxJQUFJLENBQUUsQ0FBQztTQUN2RDtJQUNGLENBQUM7QUFFRixDQUFDLEVBM0NTLGdCQUFnQixLQUFoQixnQkFBZ0IsUUEyQ3pCIn0=