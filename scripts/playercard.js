"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/sessionutil.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="avatar.ts" />
var playerCard;
(function (playerCard) {
    let _m_xuid = '';
    let _m_currentLvl = null;
    let _m_isSelf = false;
    let _m_bShownInFriendsList = false;
    let _m_tooltipDelayHandle = null;
    let _m_arrAdditionalSkillGroups = ['Wingman'];
    let _m_InventoryUpdatedHandler = null;
    let _m_ShowLockedRankSkillGroupState = false;
    let _m_cp = $.GetContextPanel();
    function _msg(text) {
    }
    function Init() {
        _m_xuid = $.GetContextPanel().GetAttributeString('xuid', 'no XUID found');
        _m_isSelf = _m_xuid === MyPersonaAPI.GetXuid() ? true : false;
        _m_bShownInFriendsList = $.GetContextPanel().GetAttributeString('data-slot', '') !== '';
        $("#AnimBackground").PopulateFromSteamID(_m_xuid);
        _RegisterForInventoryUpdate();
        if (!_m_isSelf)
            FriendsListAPI.RequestFriendProfileUpdateFromScript(_m_xuid);
        FillOutFriendCard();
    }
    playerCard.Init = Init;
    ;
    function _RegisterForInventoryUpdate() {
        _m_InventoryUpdatedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', UpdateAvatar);
        _m_cp.RegisterForReadyEvents(true);
        $.RegisterEventHandler('ReadyForDisplay', _m_cp, function () {
            if (!_m_InventoryUpdatedHandler) {
                _m_InventoryUpdatedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', UpdateAvatar);
            }
        });
        $.RegisterEventHandler('UnreadyForDisplay', _m_cp, function () {
            if (_m_InventoryUpdatedHandler) {
                $.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', _m_InventoryUpdatedHandler);
                _m_InventoryUpdatedHandler = null;
            }
        });
    }
    ;
    function FillOutFriendCard() {
        if (_m_xuid) {
            _m_currentLvl = FriendsListAPI.GetFriendLevel(_m_xuid);
            _m_ShowLockedRankSkillGroupState = !_IsPlayerPrime() && _HasXpProgressToFreeze();
            UpdateName();
            _SetAvatar();
            _SetFlairItems();
            _SetPlayerBackground();
            _SetRank();
            _SetPrimeUpsell();
            if (_m_isSelf) {
                if (MyPersonaAPI.GetPipRankWins("Competitive") >= 0) {
                    if (_m_bShownInFriendsList)
                        _SetSkillGroup('competitive');
                    else
                        SetAllSkillGroups();
                }
                else {
                    let elToggleBtn = $.GetContextPanel().FindChildInLayoutFile('SkillGroupExpand');
                    elToggleBtn.visible = false;
                }
            }
            else {
                SetAllSkillGroups();
            }
            if (_m_bShownInFriendsList) {
                $.GetContextPanel().FindChildInLayoutFile('JsPlayerCommendations').AddClass('hidden');
                $.GetContextPanel().FindChildInLayoutFile('JsPlayerPrime').AddClass('hidden');
                _SetTeam();
            }
            else {
                let bHasNoCommendsToShow = _SetCommendations();
                _SetPrime(bHasNoCommendsToShow);
            }
        }
    }
    playerCard.FillOutFriendCard = FillOutFriendCard;
    ;
    function ProfileUpdated(xuid) {
        if (_m_xuid === xuid)
            FillOutFriendCard();
    }
    playerCard.ProfileUpdated = ProfileUpdated;
    ;
    function UpdateName() {
        let elNameLabel = $.GetContextPanel().FindChildInLayoutFile('JsPlayerName');
        elNameLabel.text = FriendsListAPI.GetFriendName(_m_xuid);
    }
    playerCard.UpdateName = UpdateName;
    ;
    function _SetAvatar() {
        let elAvatarExisting = $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardAvatar');
        if (!elAvatarExisting) {
            let elParent = $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardTop');
            let elAvatar = $.CreatePanel("Panel", elParent, 'JsPlayerCardAvatar');
            elAvatar.SetAttributeString('xuid', _m_xuid);
            elAvatar.BLoadLayout('file://{resources}/layout/avatar.xml', false, false);
            elAvatar.BLoadLayoutSnippet("AvatarPlayerCard");
            Avatar.Init(elAvatar, _m_xuid, 'playercard');
            elParent.MoveChildBefore(elAvatar, $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardName'));
        }
        else {
            Avatar.Init(elAvatarExisting, _m_xuid, 'playercard');
        }
    }
    ;
    function _SetPlayerBackground() {
        let flairDefIdx = FriendsListAPI.GetFriendDisplayItemDefFeatured(_m_xuid);
        let flairItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(flairDefIdx, 0);
        let imagePath = InventoryAPI.GetItemInventoryImage(flairItemId);
        let elBgImage = $.GetContextPanel().FindChildInLayoutFile('AnimBackground');
        elBgImage.style.backgroundImage = (imagePath) ? 'url("file://{images}' + imagePath + '_large.png")' : 'none';
        elBgImage.style.backgroundPosition = '50% 50%';
        elBgImage.style.backgroundSize = '115% auto';
        elBgImage.style.backgroundRepeat = 'no-repeat';
        elBgImage.AddClass('player-card-bg-anim');
    }
    ;
    function _SetRank() {
        let elRank = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXp');
        if (!MyPersonaAPI.IsInventoryValid() || !_m_currentLvl || (!_HasXpProgressToFreeze() && !_IsPlayerPrime())) {
            elRank.AddClass('hidden');
            return;
        }
        if (!_IsPlayerPrime() && !_m_isSelf) {
            elRank.AddClass('hidden');
            return;
        }
        let bHasRankToFreezeButNoPrestige = (_m_ShowLockedRankSkillGroupState) ? true : false;
        let currentPoints = FriendsListAPI.GetFriendXp(_m_xuid), pointsPerLevel = MyPersonaAPI.GetXpPerLevel();
        let elXpBar = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXpBarInner');
        let elXpBarInner = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXpBarInner');
        if (bHasRankToFreezeButNoPrestige) {
            elXpBarInner.GetParent().visible = false;
        }
        else {
            let percentComplete = (currentPoints / pointsPerLevel) * 100;
            elXpBarInner.style.width = percentComplete + '%';
            elXpBarInner.GetParent().visible = true;
        }
        let elRankText = $.GetContextPanel().FindChildInLayoutFile('JsPlayerRankName');
        elRankText.SetHasClass('player-card-prime-text', bHasRankToFreezeButNoPrestige);
        elRank.SetHasClass('player-card-nonprime-locked-xp-row', bHasRankToFreezeButNoPrestige);
        if (bHasRankToFreezeButNoPrestige) {
            elRankText.text = $.Localize('#Xp_RankName_Locked');
        }
        else {
            elRankText.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + _m_currentLvl));
            elRankText.SetDialogVariableInt('level', _m_currentLvl);
        }
        let elRankIcon = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXpIcon');
        elRankIcon.SetImage('file://{images}/icons/xp/level' + _m_currentLvl + '.png');
        elRank.RemoveClass('hidden');
        let bPrestigeAvailable = _m_isSelf && (_m_currentLvl >= InventoryAPI.GetMaxLevel());
        $.GetContextPanel().FindChildInLayoutFile('GetPrestigeButton').SetHasClass('hidden', !bPrestigeAvailable);
        if (bPrestigeAvailable) {
            $.GetContextPanel().FindChildInLayoutFile('GetPrestigeButtonClickable').SetPanelEvent('onactivate', _OnActivateGetPrestigeButtonClickable);
        }
    }
    ;
    function _OnActivateGetPrestigeButtonClickable() {
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + '0' +
            '&' + 'asyncworkitemwarning=no' +
            '&' + 'asyncworktype=prestigecheck');
    }
    ;
    function SetAllSkillGroups() {
        let elSkillGroupContainer = $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardSkillGroupContainer');
        if (!_HasXpProgressToFreeze() && !_IsPlayerPrime()) {
            elSkillGroupContainer.AddClass('hidden');
            return;
        }
        _SetSkillGroup('Premier');
        _m_arrAdditionalSkillGroups.forEach(type => { _SetSkillGroup(type); });
        elSkillGroupContainer.RemoveClass('hidden');
    }
    playerCard.SetAllSkillGroups = SetAllSkillGroups;
    ;
    let _SetSkillForLobbyTeammates = function () {
        let skillgroupType = "competitive";
        let skillGroup = 0;
        let wins = 0;
    };
    function _SetSkillGroup(type) {
        _UpdateSkillGroup(_LoadSkillGroupSnippet(type), type);
    }
    ;
    function _LoadSkillGroupSnippet(type) {
        let id = 'JsPlayerCardSkillGroup-' + type;
        let elParent = $.GetContextPanel().FindChildInLayoutFile('SkillGroupContainer');
        let elSkillGroup = elParent.FindChildInLayoutFile(id);
        if (!elSkillGroup) {
            elSkillGroup = $.CreatePanel("Panel", elParent, id);
            elSkillGroup.BLoadLayoutSnippet('PlayerCardRatingEmblem');
            _ShowOtherRanksByDefault(elSkillGroup, type);
        }
        return elSkillGroup;
    }
    ;
    function _ShowOtherRanksByDefault(elSkillGroup, type) {
        let elToggleBtn = $.GetContextPanel().FindChildInLayoutFile('SkillGroupExpand');
        if (type !== 'Competitive' && _m_bShownInFriendsList) {
            elSkillGroup.AddClass('collapsed');
            return;
        }
        elToggleBtn.visible = _m_bShownInFriendsList ? true : false;
        if (!_m_bShownInFriendsList && _m_isSelf) {
            _AskForLocalPlayersAdditionalSkillGroups();
        }
    }
    ;
    function _AskForLocalPlayersAdditionalSkillGroups() {
        let hintLoadSkillGroups = '';
        _m_arrAdditionalSkillGroups.forEach(type => {
            if (FriendsListAPI.GetFriendCompetitiveRank(_m_xuid, type) === -1) {
                hintLoadSkillGroups += (hintLoadSkillGroups ? ',' : '') + type;
            }
        });
        if (hintLoadSkillGroups) {
            MyPersonaAPI.HintLoadPipRanks(hintLoadSkillGroups);
        }
        _m_arrAdditionalSkillGroups.forEach(type => {
            _SetSkillGroup(type);
        });
    }
    ;
    function _UpdateSkillGroup(elSkillGroup, type) {
        let options = {
            root_panel: elSkillGroup,
            xuid: _m_xuid,
            api: 'friends',
            rating_type: type,
            do_fx: true,
            full_details: true,
        };
        let haveRating = RatingEmblem.SetXuid(options);
        let showRating = haveRating || MyPersonaAPI.GetXuid() === _m_xuid;
        elSkillGroup.SetHasClass('hidden', !showRating);
        elSkillGroup.SetDialogVariable('rating-text', RatingEmblem.GetRatingDesc(elSkillGroup));
        let tooltipText = RatingEmblem.GetTooltipText(elSkillGroup);
        elSkillGroup.SetPanelEvent('onmouseover', ShowSkillGroupTooltip.bind(undefined, elSkillGroup.id, tooltipText));
        elSkillGroup.SetPanelEvent('onmouseout', HideSkillGroupTooltip);
    }
    function GetMatchWinsText(elSkillGroup, wins) {
        elSkillGroup.SetDialogVariableInt('wins', wins);
        return $.Localize('#tooltip_skill_group_wins', elSkillGroup);
    }
    ;
    function _SetPrimeUpsell() {
        let elUpsellPanel = $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardPrimeUpsell');
        elUpsellPanel.SetHasClass('hidden', !MyPersonaAPI.IsInventoryValid() || _IsPlayerPrime() || !_m_isSelf);
        elUpsellPanel.FindChildInLayoutFile("id-player-card-prime-upsell-xp").visible = !_HasXpProgressToFreeze() && !_IsPlayerPrime();
        elUpsellPanel.FindChildInLayoutFile("id-player-card-prime-upsell-skillgroup").visible = !_HasXpProgressToFreeze() && !_IsPlayerPrime();
    }
    ;
    function _SetCommendations() {
        let catagories = [
            { key: 'friendly', value: 0 },
            { key: 'teaching', value: 0 },
            { key: 'leader', value: 0 }
        ];
        let catagoriesCount = catagories.length;
        let hasAnyCommendations = false;
        let countHiddenCommends = 0;
        let elCommendsBlock = $.GetContextPanel().FindChildInLayoutFile('JsPlayerCommendations');
        for (let i = 0; i < catagoriesCount; i++) {
            catagories[i].value = FriendsListAPI.GetFriendCommendations(_m_xuid, catagories[i].key);
            let elCommend = $.GetContextPanel().FindChildInLayoutFile('JsPlayer' + catagories[i].key);
            if (!catagories[i].value || catagories[i].value === 0) {
                elCommend.AddClass('hidden');
                countHiddenCommends++;
            }
            else {
                if (elCommendsBlock.BHasClass('hidden'))
                    elCommendsBlock.RemoveClass('hidden');
                elCommend.RemoveClass('hidden');
                elCommend.FindChild('JsCommendLabel').text = String(catagories[i].value);
            }
        }
        elCommendsBlock.SetHasClass('hidden', countHiddenCommends === catagoriesCount && !_IsPlayerPrime());
        return countHiddenCommends === catagoriesCount;
    }
    ;
    function _SetPrime(bHasNoCommendsToShow) {
        let elPrime = $.GetContextPanel().FindChildInLayoutFile('JsPlayerPrime');
        if (!MyPersonaAPI.IsInventoryValid())
            elPrime.AddClass('hidden');
        if (_IsPlayerPrime()) {
            elPrime.RemoveClass('hidden');
            elPrime.FindChildInLayoutFile('JsCommendLabel').visible = bHasNoCommendsToShow;
            return;
        }
        else
            elPrime.AddClass('hidden');
    }
    ;
    function _IsPlayerPrime() {
        return FriendsListAPI.GetFriendPrimeEligible(_m_xuid);
    }
    function _HasXpProgressToFreeze() {
        return (MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() > 2)) ? true : false;
    }
    function _SetTeam() {
        if (!_m_isSelf)
            return;
        let teamName = MyPersonaAPI.GetMyOfficialTeamName(), tournamentName = MyPersonaAPI.GetMyOfficialTournamentName();
        let showTeam = !teamName ? false : true;
        if (!teamName || !tournamentName) {
            $.GetContextPanel().FindChildInLayoutFile('JsPlayerTeam').AddClass('hidden');
            return;
        }
        $.GetContextPanel().FindChildInLayoutFile('JsPlayerXp').AddClass('hidden');
        $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardSkillGroupContainer').AddClass('hidden');
        $.GetContextPanel().FindChildInLayoutFile('JsPlayerTeam').RemoveClass('hidden');
        let teamTag = MyPersonaAPI.GetMyOfficialTeamTag();
        $.GetContextPanel().FindChildInLayoutFile('JsTeamIcon').SetImage('file://{images}/tournaments/teams/' + teamTag + '.svg');
        $.GetContextPanel().FindChildInLayoutFile('JsTeamLabel').text = teamName;
        $.GetContextPanel().FindChildInLayoutFile('JsTournamentLabel').text = tournamentName;
    }
    ;
    function _SetFlairItems() {
        let flairItems = FriendsListAPI.GetFriendDisplayItemDefCount(_m_xuid);
        let flairItemIdList = [];
        let elFlairPanal = $.GetContextPanel().FindChildInLayoutFile('FlairCarouselAndControls');
        if (!flairItems) {
            elFlairPanal.AddClass('hidden');
            return;
        }
        for (let i = 0; i < flairItems; i++) {
            let flairDefIdx = FriendsListAPI.GetFriendDisplayItemDefByIndex(_m_xuid, i);
            let flairItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(flairDefIdx, 0);
            flairItemIdList.push(flairItemId);
        }
        $.GetContextPanel().FindChildInLayoutFile('FlairCarousel').RemoveAndDeleteChildren();
        _MakeFlairCarouselPages(elFlairPanal, flairItemIdList);
        elFlairPanal.RemoveClass('hidden');
    }
    ;
    function _MakeFlairCarouselPages(elFlairPanal, flairItemIdList) {
        let flairsPerPage = 5;
        let countFlairItems = flairItemIdList.length;
        let elFlairCarousel = $.GetContextPanel().FindChildInLayoutFile('FlairCarousel');
        let elCarouselPage = null;
        for (let i = 0; i < countFlairItems; i++) {
            if (i % 5 === 0) {
                elCarouselPage = $.CreatePanel('Panel', elFlairCarousel, '', { class: 'playercard-flair-carousel__page' });
            }
            function onMouseOver(flairItemId, idForTooltipLocaation) {
                let tooltipText = InventoryAPI.GetItemName(flairItemId);
                UiToolkitAPI.ShowTextTooltip(idForTooltipLocaation, tooltipText);
            }
            ;
            let imagePath = InventoryAPI.GetItemInventoryImage(flairItemIdList[i]);
            let panelName = _m_xuid + flairItemIdList[i];
            if (elCarouselPage) {
                let elFlair = $.CreatePanel('Image', elCarouselPage, panelName, {
                    class: 'playercard-flair__icon',
                    src: 'file://{images}' + imagePath + '_small.png',
                    scaling: 'stretch-to-fit-preserve-aspect'
                });
                elFlair.SetPanelEvent('onmouseover', onMouseOver.bind(undefined, flairItemIdList[i], panelName));
                elFlair.SetPanelEvent('onmouseout', function () {
                    UiToolkitAPI.HideTextTooltip();
                });
            }
        }
    }
    ;
    function ShowXpTooltip() {
        if (_m_ShowLockedRankSkillGroupState) {
            ShowSkillGroupTooltip('JsPlayerXpIcon', '#tooltip_xp_locked');
            return;
        }
        function ShowTooltip() {
            _m_tooltipDelayHandle = null;
            if (!_m_isSelf)
                return;
            if (_m_currentLvl && _m_currentLvl > 0)
                UiToolkitAPI.ShowCustomLayoutParametersTooltip('JsPlayerXpIcon', 'XpToolTip', 'file://{resources}/layout/tooltips/tooltip_player_xp.xml', 'xuid=' + _m_xuid);
        }
        ;
        _m_tooltipDelayHandle = $.Schedule(0.3, ShowTooltip);
    }
    playerCard.ShowXpTooltip = ShowXpTooltip;
    ;
    function HideXpTooltip() {
        if (_m_ShowLockedRankSkillGroupState) {
            HideSkillGroupTooltip();
            return;
        }
        if (_m_tooltipDelayHandle) {
            $.CancelScheduled(_m_tooltipDelayHandle);
            _m_tooltipDelayHandle = null;
        }
        UiToolkitAPI.HideCustomLayoutTooltip('XpToolTip');
    }
    playerCard.HideXpTooltip = HideXpTooltip;
    ;
    function ShowSkillGroupTooltip(id, tooltipText) {
        function ShowTooltipSkill() {
            _m_tooltipDelayHandle = null;
            UiToolkitAPI.ShowTextTooltip(id, tooltipText);
        }
        ;
        _m_tooltipDelayHandle = $.Schedule(0.3, ShowTooltipSkill);
    }
    playerCard.ShowSkillGroupTooltip = ShowSkillGroupTooltip;
    ;
    function HideSkillGroupTooltip() {
        if (_m_tooltipDelayHandle) {
            $.CancelScheduled(_m_tooltipDelayHandle);
            _m_tooltipDelayHandle = null;
        }
        UiToolkitAPI.HideTextTooltip();
    }
    playerCard.HideSkillGroupTooltip = HideSkillGroupTooltip;
    ;
    function UpdateAvatar() {
        _SetAvatar();
        _SetPlayerBackground();
        _SetFlairItems();
        _SetPrimeUpsell();
        _SetRank();
    }
    playerCard.UpdateAvatar = UpdateAvatar;
    ;
    function ShowHideAdditionalRanks() {
        let elToggleBtn = $.GetContextPanel().FindChildInLayoutFile('SkillGroupExpand');
        if (elToggleBtn.checked) {
            _AskForLocalPlayersAdditionalSkillGroups();
        }
        _m_arrAdditionalSkillGroups.forEach(type => {
            $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardSkillGroup-' + type).SetHasClass('collapsed', !elToggleBtn.checked);
        });
    }
    playerCard.ShowHideAdditionalRanks = ShowHideAdditionalRanks;
    ;
    function FriendsListUpdateName(xuid) {
        if (xuid === _m_xuid) {
            UpdateName();
        }
    }
    playerCard.FriendsListUpdateName = FriendsListUpdateName;
    ;
})(playerCard || (playerCard = {}));
(function () {
    if ($.DbgIsReloadingScript()) {
    }
    playerCard.Init();
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', playerCard.FillOutFriendCard);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_NameChanged', playerCard.UpdateName);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_ProfileUpdated', playerCard.ProfileUpdated);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', playerCard.SetAllSkillGroups);
    $.RegisterForUnhandledEvent("PanoramaComponent_Lobby_PlayerUpdated", playerCard.UpdateAvatar);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', playerCard.FriendsListUpdateName);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyY2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYXllcmNhcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw4Q0FBOEM7QUFDOUMseUNBQXlDO0FBQ3pDLGtDQUFrQztBQUVsQyxJQUFVLFVBQVUsQ0ErcUJuQjtBQS9xQkQsV0FBVSxVQUFVO0lBR25CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLGFBQWEsR0FBa0IsSUFBSSxDQUFDO0lBQ3hDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztJQUN0QixJQUFJLHNCQUFzQixHQUFHLEtBQUssQ0FBQztJQUNuQyxJQUFJLHFCQUFxQixHQUFlLElBQUksQ0FBQztJQUM3QyxJQUFJLDJCQUEyQixHQUFHLENBQUUsU0FBUyxDQUFFLENBQUM7SUFDaEQsSUFBSSwwQkFBMEIsR0FBa0IsSUFBSSxDQUFDO0lBQ3JELElBQUksZ0NBQWdDLEdBQUcsS0FBSyxDQUFDO0lBQzdDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUdoQyxTQUFTLElBQUksQ0FBRyxJQUFXO0lBRzNCLENBQUM7SUFFRCxTQUFnQixJQUFJO1FBRW5CLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBRSxDQUFDO1FBQzVFLFNBQVMsR0FBRyxPQUFPLEtBQUssWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5RCxzQkFBc0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQztRQUV4RixDQUFDLENBQUMsaUJBQWlCLENBQWtDLENBQUMsbUJBQW1CLENBQUUsT0FBTyxDQUFFLENBQUM7UUFFdkYsMkJBQTJCLEVB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