/// <reference path="../csgo.d.ts" />
var TintSprayIcon = (function () {
    const _Tint = function (itemId, elImage) {
        if (InventoryAPI.DoesItemMatchDefinitionByName(itemId, 'spraypaint') || InventoryAPI.DoesItemMatchDefinitionByName(itemId, 'spray')) {
            const colorTint = InventoryAPI.GetSprayTintColorCode(itemId);
            if (colorTint) {
                elImage.style.washColor = colorTint.toString();
            }
            else {
                elImage.style.washColor = 'none';
            }
        }
        else {
            elImage.style.washColor = 'none';
        }
    };
    return {
        CheckIsSprayAndTint: _Tint
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGludF9zcHJheV9pY29uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGludF9zcHJheV9pY29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQUlyQyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBRXJCLE1BQU0sS0FBSyxHQUFHLFVBQVUsTUFBYyxFQUFFLE9BQWdCO1FBRXZELElBQUssWUFBWSxDQUFDLDZCQUE2QixDQUFFLE1BQU0sRUFBRSxZQUFZLENBQUUsSUFBSSxZQUFZLENBQUMsNkJBQTZCLENBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBRSxFQUN4STtZQUNDLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxNQUFNLENBQUUsQ0FBQztZQUUvRCxJQUFLLFNBQVMsRUFDZDtnQkFDQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDL0M7aUJBRUQ7Z0JBQ0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO2FBQ2pDO1NBQ0Q7YUFFRDtZQUNDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQztTQUNqQztJQUNGLENBQUMsQ0FBQztJQWdCRixPQUFNO1FBQ0wsbUJBQW1CLEVBQUcsS0FBSztLQUUzQixDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyJ9