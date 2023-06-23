/// <reference path="../csgo.d.ts" />
/// <reference path="../common/async.ts" />
var HudEdgePositions;
(function (HudEdgePositions) {
    const m_CP = $.GetContextPanel();
    const m_Edge = $('#HudEdge');
    const m_XSlider = $('#HudEdgeX');
    const m_YSlider = $('#HudEdgeY');
    async function Init() {
        m_XSlider.OnShow();
        m_YSlider.OnShow();
        await Async.NextFrame();
        HudEdgePositions.Update();
    }
    HudEdgePositions.Init = Init;
    function Update() {
        const height = m_CP.actuallayoutheight / m_CP.actualuiscale_y;
        const width = m_CP.actuallayoutwidth / m_CP.actualuiscale_x;
        const minHeight = m_YSlider.actualvalue * height;
        m_XSlider.min = minHeight / width;
        if (m_XSlider.actualvalue < m_XSlider.min)
            m_XSlider.actualvalue = m_XSlider.min;
        m_Edge.style.margin = `${(1 - m_YSlider.actualvalue) * 100 / 2}% ${(1 - m_XSlider.actualvalue) * 100 / 2}%`;
    }
    HudEdgePositions.Update = Update;
    ;
})(HudEdgePositions || (HudEdgePositions = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfaHVkX2VkZ2VfcG9zaXRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9wdXBfaHVkX2VkZ2VfcG9zaXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQUNyQywyQ0FBMkM7QUFFM0MsSUFBVSxnQkFBZ0IsQ0ErQnpCO0FBL0JELFdBQVUsZ0JBQWdCO0lBRXRCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNqQyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUUsVUFBVSxDQUFHLENBQUM7SUFDaEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFFLFdBQVcsQ0FBMEIsQ0FBQztJQUMzRCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUUsV0FBVyxDQUEwQixDQUFDO0lBRXBELEtBQUssVUFBVSxJQUFJO1FBS3RCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuQixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFbkIsTUFBTSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFeEIsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQVhxQixxQkFBSSxPQVd6QixDQUFBO0lBRUQsU0FBZ0IsTUFBTTtRQUVsQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUM1RCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQztRQUNqRCxTQUFTLENBQUMsR0FBRyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDbEMsSUFBSyxTQUFTLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxHQUFHO1lBQ3RDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQztRQUUxQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFDcEgsQ0FBQztJQVZlLHVCQUFNLFNBVXJCLENBQUE7SUFBQSxDQUFDO0FBQ04sQ0FBQyxFQS9CUyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBK0J6QiJ9