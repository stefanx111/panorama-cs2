"use strict";
/// <reference path="csgo.d.ts" />
var ParticleControls;
(function (ParticleControls) {
    function GetAllChildren(panel) {
        const children = panel.Children();
        return [...children, ...children.flatMap(GetAllChildren)];
    }
    function IsParticleScenePanel(panel) {
        return panel.type === "ParticleScenePanel";
    }
    function GetWorldExtendsFromCamFov(fov, xpos, ypos, zpos, pheight, pwidth) {
        var height = Math.tan(fov * .5) * Math.sqrt((xpos * xpos) + (ypos * ypos) + (zpos * zpos));
        var width = (pwidth / pheight) * height;
        return { height, width };
    }
    function StartAllChildrenParticles(elContainerPanel) {
        const AllPanels = GetAllChildren(elContainerPanel);
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel)) {
                panel.StopParticlesImmediately(true);
                panel.StartParticles();
            }
        }
    }
    ParticleControls.StartAllChildrenParticles = StartAllChildrenParticles;
    function StopAllChildrenParticlesImmediately(elContainerPanel) {
        const AllPanels = GetAllChildren(elContainerPanel);
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel))
                panel.StopParticlesImmediately(true);
        }
    }
    ParticleControls.StopAllChildrenParticlesImmediately = StopAllChildrenParticlesImmediately;
    function RestartStatusRank(panelId, x, y, z) {
        const panel = $(panelId);
        if (panel && IsParticleScenePanel(panel)) {
            panel.StopParticlesImmediately(true);
            panel.StartParticles();
            panel.SetControlPoint(3, x, y, z);
        }
    }
    ParticleControls.RestartStatusRank = RestartStatusRank;
    function SACVpcfParticleSystem(panelId, particlename) {
        const panel = $(panelId);
        if (panel && IsParticleScenePanel(panel)) {
            panel.StopParticlesImmediately(true);
            panel.SetParticleNameAndRefresh(particlename);
            panel.SetControlPoint(0, 0, 0, 0);
            panel.StartParticles();
        }
    }
    ParticleControls.SACVpcfParticleSystem = SACVpcfParticleSystem;
    function UpdateMainMenuTopBar(elPanel, curTabID) {
        var g_RadioButtonIdLookup = {
            JsInventory: "#MainMenuNavBarInventory",
            JsLoadout: "#MainMenuNavBarLoadout",
            JsPlay: "#MainMenuNavBarPlay",
            JsMainMenuStore: "#MainMenuNavBarStore",
            JsPlayerStats: "#MainMenuNavBarStats",
            JsMainMenuNews: "#MainMenuNavBarNews",
        };
        const Color = [85, 212, 238];
        const HColor = [0, 255, 212];
        if (g_RadioButtonIdLookup[curTabID] == null) {
            elPanel.SetControlPoint(1, 1, 1, 1);
            elPanel.SetControlPoint(1, 0, 0, 0);
            elPanel.SetControlPoint(2, 96, 0, .75);
            elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
            elPanel.SetControlPoint(17, HColor[0], HColor[1], HColor[2]);
            return;
        }
        const elContainer = $("#MainMenuNavBarCenterContainer");
        var curTabButton = $(g_RadioButtonIdLookup[curTabID]);
        const particleWidthInGameUnits = 32 * 35;
        if (curTabButton && elContainer) {
            const particlePanelScalar = particleWidthInGameUnits / elPanel.actuallayoutwidth;
            curTabButton.checked = true;
            const curLabel = curTabButton.FindChildrenWithClassTraverse("mainmenu-top-navbar__radio-btn__label")[0];
            let center = ((elContainer.actuallayoutwidth * .5) - (curTabButton.actualxoffset + (curTabButton.actuallayoutwidth * .5)));
            center *= (particlePanelScalar);
            const buffer = 20;
            const width = (curLabel.actuallayoutwidth * .5 + buffer) * particlePanelScalar;
            elPanel.SetControlPoint(1, center + 1, 0, 0);
            elPanel.SetControlPoint(1, center, 0, 0);
            elPanel.SetControlPoint(2, width, .1, .25);
        }
        else {
            elPanel.SetControlPoint(1, 0, 0, 0);
            elPanel.SetControlPoint(2, 96, 0, .25);
            elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
            elPanel.SetControlPoint(17, HColor[0], HColor[1], HColor[2]);
        }
    }
    ParticleControls.UpdateMainMenuTopBar = UpdateMainMenuTopBar;
    function InitMainMenuTopBar(elPanel) {
        const Color = [85, 212, 238];
        const HColor = [0, 255, 212];
        elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
    }
    ParticleControls.InitMainMenuTopBar = InitMainMenuTopBar;
    function UpdateActionBar(elPanel, curTabID) {
        const myParent = elPanel.GetParent();
        const marginx = 20;
        const ButtonBg = myParent.FindChildrenWithClassTraverse('play-menu__playbtn__bg')[0];
        const buttonWidth = ButtonBg.actuallayoutwidth + 2;
        const lookat = [550, 0, 70];
        var g_RadioButtonIdLookup = {
            RmoveBtnEffects: "#PartyCancelBtn",
            StartMatchBtn: "#StartMatchBtn",
        };
        if (g_RadioButtonIdLookup[curTabID] == null)
            return;
        if (g_RadioButtonIdLookup[curTabID] == "#StartMatchBtn") {
            const buttonHeight = ButtonBg.actuallayoutheight;
            const camOffsetFromLookat = [0, 330, 0];
            var PanelWorldSize = GetWorldExtendsFromCamFov(120, camOffsetFromLookat[0], camOffsetFromLookat[1], camOffsetFromLookat[2], elPanel.actuallayoutheight, elPanel.actuallayoutwidth);
            let gametoWorldScalar = (PanelWorldSize.width * 2) / elPanel.actuallayoutwidth;
            const Color = [15, 231, 15];
            elPanel.StartParticleSystem("particles/ui/ui_mainmenu_playaction_active.vpcf");
            elPanel.StartParticles();
            const col = 17;
            const row = Math.floor((buttonHeight * gametoWorldScalar) / 32);
            elPanel.SetControlPoint(1, (buttonWidth * .5 - marginx) * gametoWorldScalar + Math.random(), 0, lookat[2]);
            elPanel.SetControlPoint(2, col, row, .25);
            elPanel.SetControlPoint(5, 1, 20, 0);
            elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
        }
        else if (g_RadioButtonIdLookup[curTabID] == "#PartyCancelBtn") {
            const Color = [0, 0, 0];
            elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
            elPanel.StopParticlesImmediately(true);
        }
        else {
            const Color = [60, 60, 60];
            elPanel.SetControlPoint(5, 0, 0, 0);
            elPanel.SetControlPoint(2, 17, 3, .25);
            elPanel.SetControlPoint(16, Color[0], Color[1], Color[2]);
            elPanel.StopParticlesImmediately(true);
        }
    }
    ParticleControls.UpdateActionBar = UpdateActionBar;
})(ParticleControls || (ParticleControls = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGljbGVfY29udHJvbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jb250ZW50L2NzZ28vcGFub3JhbWEvc2NyaXB0cy9wYXJ0aWNsZV9jb250cm9scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBTWxDLElBQVUsZ0JBQWdCLENBcU16QjtBQXJNRCxXQUFVLGdCQUFnQjtJQUV0QixTQUFTLGNBQWMsQ0FBRyxLQUFjO1FBRXBDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPLENBQUUsR0FBRyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFFLGNBQWMsQ0FBRSxDQUFFLENBQUM7SUFDbEUsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsS0FBYztRQUUxQyxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUM7SUFDL0MsQ0FBQztJQUVELFNBQVMseUJBQXlCLENBQUcsR0FBVyxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsSUFBWSxFQUFFLE9BQWUsRUFBRSxNQUFjO1FBRXZILElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBRSxJQUFJLEdBQUcsSUFBSSxDQUFFLEdBQUcsQ0FBRSxJQUFJLEdBQUcsSUFBSSxDQUFFLEdBQUcsQ0FBRSxJQUFJLEdBQUcsSUFBSSxDQUFFLENBQUUsQ0FBQztRQUNyRyxJQUFJLEtBQUssR0FBRyxDQUFFLE1BQU0sR0FBRyxPQUFPLENBQUUsR0FBRyxNQUFNLENBQUM7UUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBR0QsU0FBZ0IseUJBQXlCLENBQUcsZ0JBQXlCO1FBRWpFLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBRSxnQkFBZ0IsQ0FBRSxD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