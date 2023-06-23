/// <reference path="../csgo.d.ts" />
function UpdateNavContentSelectionBar(btn, elSelectionBar) {
    const selectedBtn = $('#' + btn);
    const elContentNavBar = elSelectionBar.FindChildTraverse('JsContentNavBar');
    if (!selectedBtn) {
        elContentNavBar.style.position = '0px 0px 0px';
        return;
    }
    elContentNavBar.style.position = selectedBtn.actualxoffset + 'px 0px 0px';
    elContentNavBar.style.width = selectedBtn.contentwidth + 'px';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWFuaW1zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVudWFuaW1zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQUVyQyxTQUFTLDRCQUE0QixDQUFFLEdBQVcsRUFBRSxjQUF1QjtJQUV2RSxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ25DLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRyxDQUFDO0lBRy9FLElBQUksQ0FBQyxXQUFXLEVBQ2hCO1FBQ0ksZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsYUFBYSxDQUFDO1FBQy9DLE9BQU87S0FDVjtJQUVELGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxhQUFhLEdBQUUsWUFBWSxDQUFDO0lBQ3pFLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxZQUFZLEdBQUUsSUFBSSxDQUFDO0FBQ2pFLENBQUMifQ==