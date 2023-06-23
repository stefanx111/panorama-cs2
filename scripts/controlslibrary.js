/// <reference path="csgo.d.ts" />
/// <reference path="common/iteminfo.ts" />
var controlsLibActiveTab = null;
function ControlsLibNavigateToTab(tab, msg) {
    if (controlsLibActiveTab) {
        controlsLibActiveTab.RemoveClass('Active');
    }
    controlsLibActiveTab = $('#' + tab);
    if (controlsLibActiveTab) {
        controlsLibActiveTab.AddClass('Active');
    }
}
function CloseControlsLib() {
    $.GetContextPanel().DeleteAsync(.3);
    var controlsLibPanel = $.GetContextPanel();
    controlsLibPanel.RemoveClass("Active");
}
function OpenControlsLib() {
    var controlsLibPanel = $.GetContextPanel();
    controlsLibPanel.AddClass("Active");
}
var jsPopupCallbackHandle = null;
var jsPopupLoadingBarCallbackHandle = null;
var popupLoadingBarLevel = 0;
function ClearPopupsText() {
    $('#ControlsLibPopupsText').text = '--';
}
function OnControlsLibPopupEvent(msg) {
    $('#ControlsLibPopupsText').text = msg;
}
function OnPopupCustomLayoutParamsPressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test.xml', 'popupvalue=123456&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImagePressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image&image=file://{images}/control_icons/home_icon.vtf&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImageSpinnerPressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image and a spinner&image=file://{images}/control_icons/home_icon.vtf&spinner=1&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImageLoadingPressed() {
    ClearPopupsText();
    popupLoadingBarLevel = 0;
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image and a loading bar&image=file://{images}/control_icons/home_icon.vtf&callback=' + jsPopupCallbackHandle + '&loadingBarCallback=' + jsPopupLoadingBarCallbackHandle);
}
function OnPopupCustomLayoutMatchAccept() {
    ClearPopupsText();
    popupLoadingBarLevel = 0;
    var popup = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_accept_match.xml', 'map_and_isreconnect=de_dust2,false');
    $.DispatchEvent("ShowAcceptPopup", popup);
}
function OnPopupCustomLayoutWeaponUpdate() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_weapon_update.xml', "23");
}
function OnPopupCustomLayoutOpFull() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_operation_launch.xml', 'none');
}
function OnPopupCustomLayoutSurvivalEndOfMatch() {
    var elPanel = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/survival/survival_endofmatch.xml', 'usefakedata=true');
}
function OnPopupCustomLayoutXpGrant() {
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_acknowledge_xpgrant.xml', 'none');
}
function OnPopupCustomLayoutOperationHub(startPage) {
    var nActiveSeason = GameTypesAPI.GetActiveSeasionIndexValue();
    if (nActiveSeason < 0)
        return;
    var elPanel = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/operation/operation_main.xml', 'none');
    elPanel.SetAttributeInt("season_access", nActiveSeason);
    if (startPage)
        elPanel.SetAttributeInt("start_page", startPage);
}
function OnPopupCustomLayoutLoadingScreen() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopup('teams', 'file://{resources}/layout/teamselectmenu.xml');
}
function OnControlsLibPopupLoadingBarEvent() {
    popupLoadingBarLevel += 0.05;
    if (popupLoadingBarLevel > 1.0) {
        popupLoadingBarLevel = 1.0;
    }
}
var jsContextMenuCallbackHandle = null;
function ClearContextMenuText() {
    $('#ControlsLibContextMenuText').text = '--';
}
function OnControlsLibContextMenuEvent(msg) {
    $('#ControlsLibContextMenuText').text = msg;
}
function OnSimpleContextMenu() {
    ClearContextMenuText();
    var items = [];
    items.push({ label: 'Item 1', jsCallback: function () { OnControlsLibContextMenuEvent('Item1'); } });
    items.push({ label: 'Item 2', jsCallback: function () { OnControlsLibContextMenuEvent('Item2'); } });
    items.push({ label: 'Item 3', jsCallback: function () { OnControlsLibContextMenuEvent('Item3'); } });
    UiToolkitAPI.ShowSimpleContextMenu('', 'ControlLibSimpleContextMenu', items);
}
function OnContextMenuCustomLayoutParamsPressed() {
    ClearContextMenuText();
    UiToolkitAPI.ShowCustomLayoutContextMenuParameters('', '', 'file://{resources}/layout/context_menus/context_menu_custom_layout_test.xml', 'test=123456&callback=' + jsContextMenuCallbackHandle);
}
var g_VideoNumTrailers = 2;
var g_VideoCurrentTrailer = 0;
function VideoPlayNextTrailer() {
    g_VideoCurrentTrailer = (g_VideoCurrentTrailer + 1) % g_VideoNumTrailers;
    var videoPlayer = $('#VideoTrailerPlayer');
    videoPlayer.SetMovie("file://{resources}/videos/trailer_" + g_VideoCurrentTrailer + ".webm");
    videoPlayer.SetTitle("Trailer " + g_VideoCurrentTrailer);
    videoPlayer.Play();
}
var g_sceneanimsList = [
    'cu_ct_pose01',
    'cu_ct_pose02',
    'cu_ct_pose03',
    'cu_ct_pose04',
    'cu_t_pose01',
    'cu_t_pose02',
    'cu_t_pose03',
    'cu_t_pose04',
];
var g_sceneanimindex = 0;
var g_maxsceneitemcontext = 5;
var g_sceneitemcontext = 0;
function InitScenePanel() {
    g_sceneanimindex = 0;
    var charT = LoadoutAPI.GetItemID('ct', 'customplayer');
    var model = ItemInfo.GetModelPlayer(charT);
    var playerPanel = $("#Player1");
    playerPanel.SetSceneAngles(0, 0, 0, false);
    playerPanel.SetPlayerModel(model);
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
    playerPanel.SetCameraPreset(6, false);
}
function SceneNextAnimSequence() {
    g_sceneanimindex++;
    if (g_sceneanimindex >= g_sceneanimsList.length) {
        g_sceneanimindex = 0;
    }
    var playerPanel = $("#Player1");
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
}
function ScenePrevAnimSequence() {
    g_sceneanimindex--;
    if (g_sceneanimindex < 0) {
        g_sceneanimindex = g_sceneanimsList.length - 1;
    }
    var playerPanel = $("#Player1");
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
}
function GenerateInventoryImages() {
    $("#Player1").GenerateInventoryImages();
}
var g_DialogVarCount = 0;
function UpdateParentDialogVariablesFromTextEntry(panelName) {
    var varStr = $("#ParentDialogVarTextEntry").text;
    $("#DialogVarParentPanel").SetDialogVariable('testvar', varStr);
}
function UpdateChildDialogVariablesFromTextEntry(panelName) {
    var varStr = $("#ChildDialogVarTextEntry").text;
    $("#DialogVarChildPanel").SetDialogVariable('testvar', varStr);
}
function InitDialogVariables() {
    $("#ControlsLibDiagVars").SetDialogVariableInt("count", g_DialogVarCount);
    $("#ControlsLibDiagVars").SetDialogVariable("s1", "Test1");
    $("#ControlsLibDiagVars").SetDialogVariable("s2", "Test2");
    $("#ControlsLibDiagVars").SetDialogVariable("cam_key", "%jump%");
    $("#ControlsLibDiagVars").SetDialogVariable("np_key", "%attack%");
    $("#ControlsLibDiagVars").SetDialogVariable("sp_key", "%radio%");
    $("#DiagVarLabel").text = $.Localize("\tDynamic Label Count: {d:r:count}", $("#ControlsLibDiagVars"));
    $.Schedule(1.0, UpdateDialogVariables);
    $("#ParentDialogVarTextEntry").RaiseChangeEvents(true);
    $("#ChildDialogVarTextEntry").RaiseChangeEvents(true);
    $.RegisterEventHandler('TextEntryChanged', $("#ParentDialogVarTextEntry"), UpdateParentDialogVariablesFromTextEntry);
    $.RegisterEventHandler('TextEntryChanged', $("#ChildDialogVarTextEntry"), UpdateChildDialogVariablesFromTextEntry);
}
function UpdateDialogVariables() {
    g_DialogVarCount++;
    $("#ControlsLibDiagVars").SetDialogVariableInt("count", g_DialogVarCount);
    $.Schedule(1.0, UpdateDialogVariables);
}
function InitCaseTest() {
    $("#CaseTest").SetDialogVariable("casetest", "iİıI");
}
function OnImageFailLoad() {
    $("#ControlsLibPanelImageFallback").SetImage("file://{images}/icons/knife.psd");
}
function InitPanels() {
    var parent = $.FindChildInContext("#ControlsLibPanelsDynParent");
    $.CreatePanel('Label', parent, '', { text: 'Label, with text property, created dynamically from js.' });
    $.CreatePanel('Label', parent, '', { class: 'fontSize-l fontWeight-Bold', style: 'color:#558927;', text: 'Label, with text and class properties, created dynamically from js.' });
    $.CreatePanel('TextButton', parent, '', { class: 'PopupButton', text: "Output to console", onactivate: "$.Msg('Panel tab - Button pressed !!!')" });
    $.CreatePanel('ControlLibTestPanel', $.FindChildInContext('#ControlsLibPanelsJS'), '', { MyCustomProp: 'Created dynamically from javascript', CreatedFromJS: 1 });
    $.RegisterEventHandler('ImageFailedLoad', $("#ControlsLibPanelImageFallback"), OnImageFailLoad);
    $("#ControlsLibPanelImageFallback").SetImage("file://{images}/unknown2.vtf");
    $("#ImageApngtest").SetImage("file://{resources}/videos/test/apngtestnoext");
}
function TransitionBlurPanel() {
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimOut");
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimIn");
    $("#MyBlendBlurFitParent").AddClass("TheBlurAnimIn");
}
function TransitionBlurPanel2() {
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimIn");
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimOut");
    $("#MyBlendBlurFitParent").AddClass("TheBlurAnimOut");
}
function CreateSvgFromJs() {
    $.CreatePanel('Image', $('#svgButton'), '', {
        src: "file://{images}/icons/ui/smile.svg",
        texturewidth: 100,
        textureheight: 100
    });
}
function GetRssFeed() {
    BlogAPI.RequestRSSFeed();
}
function OnRssFeedReceived(feed) {
    var RSSFeedPanel = $("#RSSFeed");
    if (RSSFeedPanel == null) {
        return;
    }
    RSSFeedPanel.RemoveAndDeleteChildren();
    for (const item of feed.items) {
        var itemPanel = $.CreatePanel('Panel', RSSFeedPanel, '', { acceptsinput: true });
        itemPanel.AddClass('RSSFeed__Item');
        $.CreatePanel('Label', itemPanel, '', { text: item.title, html: true, class: 'RSSFeed__ItemTitle' });
        if (item.imageUrl.length !== 0) {
            $.CreatePanel('Image', itemPanel, '', { src: item.imageUrl, class: 'RSSFeed__ItemImage', scaling: 'stretch-to-fit-preserve-aspect' });
        }
        $.CreatePanel('Label', itemPanel, '', { text: item.description, html: true, class: 'RSSFeed__ItemDesc' });
        $.CreatePanel('Label', itemPanel, '', { text: item.date, html: true, class: 'RSSFeed__ItemDate' });
        itemPanel.SetPanelEvent("onactivate", SteamOverlayAPI.OpenURL.bind(SteamOverlayAPI, item.link));
    }
}
function JSReadyReset() {
    var elParent = $('#ControlsLibBugsReadyParent');
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    elParent.RemoveAndDeleteChildren();
    elParent.SetReadyForDisplay(false);
    elBtnAddChild.enabled = true;
    elBtnAddBgImg.enabled = false;
}
function JSReadyAddChild() {
    var elParent = $('#ControlsLibBugsReadyParent');
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    $.CreatePanel('Panel', elParent, 'ControlsLibBugsReadyChild', { class: 'ControlLibBugs__ReadyChild' });
    elBtnAddChild.enabled = false;
    elBtnAddBgImg.enabled = true;
}
function JSReadyAddBgImg() {
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    var elParent = $('#ControlsLibBugsReadyParent');
    var elChild = $('#ControlsLibBugsReadyChild');
    elBtnAddChild.enabled = false;
    elBtnAddBgImg.enabled = false;
    elChild.AddClass('ControlLibBugs__ReadyChild--Ready');
    elParent.SetReadyForDisplay(true);
}
function JSTestTransition() {
    var Delay = 0.2;
    function _reveal(panelId) {
        $(panelId).AddClass('TestTransition');
    }
    $.Schedule(Delay, () => _reveal("#RepaintBugGrandchild"));
    $.Schedule(Delay * 2.0, () => _reveal("#RepaintBugChild"));
}
function JSResetTransition() {
    $('#RepaintBugChild').RemoveClass('TestTransition');
    $('#RepaintBugGrandchild').RemoveClass('TestTransition');
}
function JSControlsPageStartParticles() {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.StartParticles();
    }
}
function JSControlsPageStopPlayEndCapParticles() {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.StopParticlesWithEndcaps();
    }
}
function JSControlsPageSetControlPointParticles(cp, xpos, ypos, zpos) {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.SetControlPoint(cp, 0, 1 + ypos, zpos);
        curPanel.SetControlPoint(cp, xpos, ypos, zpos);
    }
}
(function () {
    OpenControlsLib();
    ControlsLibNavigateToTab('ControlLibStyleGuide', 'init');
    var elTime = $("#TimeZoo");
    if (elTime) {
        elTime.SetDialogVariableTime("time", 1605560584);
    }
    jsPopupCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibPopupEvent);
    jsContextMenuCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibContextMenuEvent);
    jsPopupLoadingBarCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibPopupLoadingBarEvent);
    $.RegisterForUnhandledEvent("PanoramaComponent_Blog_RSSFeedReceived", OnRssFeedReceived);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbHNsaWJyYXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29udHJvbHNsaWJyYXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFDLGtDQUFrQztBQUNuQywyQ0FBMkM7QUFNM0MsSUFBSSxvQkFBb0IsR0FBbUIsSUFBSSxDQUFDO0FBRWhELFNBQVMsd0JBQXdCLENBQUcsR0FBVyxFQUFFLEdBQVc7SUFJeEQsSUFBSyxvQkFBb0IsRUFDekI7UUFDSSxvQkFBb0IsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7S0FDaEQ7SUFFRCxvQkFBb0IsR0FBRyxDQUFDLENBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBRXRDLElBQUssb0JBQW9CLEVBQ3pCO1FBQ0ksb0JBQW9CLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO0tBQzdDO0FBRUwsQ0FBQztBQUVELFNBQVMsZ0JBQWdCO0lBR3JCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxXQUFXLENBQUUsRUFBRSxDQUFFLENBQUM7SUFFdEMsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0MsZ0JBQWdCLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO0FBQzdDLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFFcEIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0MsZ0JBQWdCLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO0FBQzFDLENBQUM7QUFLRCxJQUFJLHFCQUFxQixHQUFrQixJQUFJLENBQUM7QUFDaEQsSUFBSSwrQkFBK0IsR0FBa0IsSUFBSSxDQUFDO0FBQzFELElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0FBRTdCLFNBQVMsZUFBZTtJQUVsQixDQUFDLENBQUUsd0JBQXdCLENBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQzdELENBQUM7QUFFRCxTQUFTLHVC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