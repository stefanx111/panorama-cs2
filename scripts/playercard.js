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
    let _m_arrAdditionalSkillGroups = ['Wingman', 'Dangerzone'];
    let _m_InventoryUpdatedHandler = null;
    let _m_ShowLockedRankSkillGroupState = false;
    let _m_cp = $.GetContextPanel();
    function _msg(text) {
        $.Msg('playercard.ts: ' + text);
    }
    function Init() {
        _m_xuid = $.GetContextPanel().GetAttributeString('xuid', 'no XUID found');
        _m_isSelf = _m_xuid === MyPersonaAPI.GetXuid() ? true : false;
        _m_bShownInFriendsList = $.GetContextPanel().GetAttributeString('data-slot', '') !== '';
        $("#AnimBackground").PopulateFromSteamID(_m_xuid);
        _RegisterForInventoryUpdate();
        $.Msg((_m_bShownInFriendsList ? 'Friend Entry' : 'Popup Card') + ' for xuid: ' + _m_xuid);
        // Asks GC to get player information since this may not be a local player.
        // 'PanoramaComponent_FriendsList_ProfileUpdated' Player card will listen for this event to update with info.
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
            // General elements available for everybody
            UpdateName();
            _SetAvatar();
            _SetFlairItems();
            _SetPlayerBackground();
            _SetRank();
            _SetPrimeUpsell();
            // Skill group elements and expanding section with other skill groups
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
            // Commendations and prime
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
        //This is used for updating friends cards from the callback 'PanoramaComponent_FriendsList_ProfileUpdated'.
        $.Msg('-----ProfileUpdated-----');
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
            //$.DispatchEvent( 'InitAvatar', elAvatar, _m_xuid, 'PlayerCard' );
            Avatar.Init(elAvatar, _m_xuid, 'playercard');
            elParent.MoveChildBefore(elAvatar, $.GetContextPanel().FindChildInLayoutFile('JsPlayerCardName'));
        }
        else {
            //$.DispatchEvent( 'InitAvatar', elAvatarExisting, _m_xuid, 'PlayerCard' );
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
        // CSGO_SOURCE2_UNIMPLEMENTED elBgImage.style.backgroundImgOpacity = '0.2';
        elBgImage.AddClass('player-card-bg-anim');
    }
    ;
    function _SetRank() {
        // $.Msg('Player Card currentLvl: ' + _m_currentLvl );
        // $.Msg('Player Card _HasXpProgressToFreeze(): ' + _HasXpProgressToFreeze() );
        // $.Msg('Player Card _IsPlayerPrime(): ' + _IsPlayerPrime() );
        // $.Msg('MyPersonaAPI.IsInventoryValid(): ' + MyPersonaAPI.IsInventoryValid() );
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
        // Set Xp bar and show.
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
        // Set Xp rank name.
        let elRankText = $.GetContextPanel().FindChildInLayoutFile('JsPlayerRankName');
        // if the rank is frozen, use the same styling as the upsell non-prime case
        elRankText.SetHasClass('player-card-prime-text', bHasRankToFreezeButNoPrestige);
        elRank.SetHasClass('player-card-nonprime-locked-xp-row', bHasRankToFreezeButNoPrestige);
        if (bHasRankToFreezeButNoPrestige) {
            elRankText.text = $.Localize('#Xp_RankName_Locked');
        }
        else {
            elRankText.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + _m_currentLvl));
            elRankText.SetDialogVariableInt('level', _m_currentLvl);
        }
        // Set Xp rank image and show.
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
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + '0' + // InventoryAPI.GetFauxItemIDFromDefAndPaintIndex( 1353, 0 ) // Game License shooting guy
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
        _SetSkillGroup('Competitive');
        _m_arrAdditionalSkillGroups.forEach(type => { _SetSkillGroup(type); });
        //DEVONLY{
        const DEBUG_SKILLGROUPS = false;
        if (DEBUG_SKILLGROUPS) {
            _SetSkillGroupOld('competitive');
            _m_arrAdditionalSkillGroups.forEach(type => { _SetSkillGroupOld(type); });
        }
        //}DEVONLY
        elSkillGroupContainer.RemoveClass('hidden');
    }
    playerCard.SetAllSkillGroups = SetAllSkillGroups;
    ;
    let _SetSkillForLobbyTeammates = function () {
        let skillgroupType = "competitive";
        let skillGroup = 0;
        let wins = 0;
        // if ( !_m_isSelf && PartyListAPI.GetPartyMemberSetting( _m_xuid, "xuid" ) )
        // {
        // 	skillgroupType = PartyListAPI.GetFriendCompetitiveRankType( _m_xuid );
        // 	skillGroup = PartyListAPI.GetFriendCompetitiveRank( _m_xuid, skillgroupType );
        // 	wins = PartyListAPI.GetFriendCompetitiveWins( _m_xuid, skillgroupType );
        // 	if ( skillgroupType === "Competitive" )
        // 	{
        // 		_UpdateSkillGroup ( _LoadSkillGroupSnippet( skillgroupType ), skillGroup, wins, '' );
        // 	}
        // 	else
        // 	{
        // 		_UpdateSkillGroup ( _LoadSkillGroupSnippet( skillgroupType ), skillGroup, wins, skillgroupType );
        // 	}
        // }
    };
    //DEVONLY{
    function _SetSkillGroupOld(type) {
        let skillGroup = FriendsListAPI.GetFriendCompetitiveRank(_m_xuid, type);
        let wins = FriendsListAPI.GetFriendCompetitiveWins(_m_xuid, type);
        _UpdateSkillGroupOld(_LoadSkillGroupSnippetOld(type), skillGroup, wins, type);
    }
    ;
    function _LoadSkillGroupSnippetOld(type) {
        let id = 'JsPlayerCardSkillGroupOld-' + type;
        let elParent = $.GetContextPanel().FindChildInLayoutFile('SkillGroupContainer');
        let elSkillGroup = elParent.FindChildInLayoutFile(id);
        if (!elSkillGroup) {
            elSkillGroup = $.CreatePanel("Panel", elParent, id);
            elSkillGroup.BLoadLayoutSnippet('PlayerCardSkillGroup');
            _ShowOtherRanksByDefault(elSkillGroup, type);
        }
        return elSkillGroup;
    }
    ;
    function _UpdateSkillGroupOld(elSkillGroup, skillGroup, wins, type) {
        let winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(type);
        let tooltipText = '';
        let isloading = (skillGroup === -1) ? true : false;
        let typeModifier = (_m_arrAdditionalSkillGroups.indexOf(type) >= 0) ? type : '';
        let imageName = (typeModifier !== '') ? typeModifier : 'skillgroup';
        let bNonPrimeButHasXpProgress = (_m_ShowLockedRankSkillGroupState) ? true : false;
        // if the skill group is frozen, use the same styling as the upsell non-prime case
        if (bNonPrimeButHasXpProgress) {
            elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').SetHasClass('player-card-prime-text', bNonPrimeButHasXpProgress);
            if (!_m_bShownInFriendsList) {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').SetHasClass('player-card-prime-text--popup', bNonPrimeButHasXpProgress);
            }
        }
        if (wins < winsNeededForRank || isloading) {
            // Not enough wins for a skillGroup
            if (!_m_isSelf)
                return;
            if (isloading) {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillIcon').SetImage('file://{images}/icons/skillgroups/' + imageName + '_none.svg');
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#SFUI_LOADING');
            }
            else if (bNonPrimeButHasXpProgress) {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_locked');
                tooltipText = $.Localize('#tooltip_skill_group_locked');
            }
            else {
                let winsneeded = (winsNeededForRank - wins);
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillIcon').SetImage('file://{images}/icons/skillgroups/' + imageName + '_none.svg');
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_0' + typeModifier);
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').SetDialogVariableInt("winsneeded", winsneeded);
                tooltipText = $.Localize('#tooltip_skill_group_none' + typeModifier, elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel'));
            }
        }
        else if (wins >= winsNeededForRank && skillGroup < 1) {
            // Skill group expired.
            if (!_m_isSelf)
                return;
            elSkillGroup.FindChildInLayoutFile('JsPlayerSkillIcon').SetImage('file://{images}/icons/skillgroups/' + imageName + '_expired.svg');
            if (bNonPrimeButHasXpProgress) {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_locked');
            }
            else {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_expired' + typeModifier);
            }
            tooltipText = bNonPrimeButHasXpProgress ? $.Localize('#tooltip_skill_group_locked') : $.Localize('#tooltip_skill_group_expired' + typeModifier);
        }
        else {
            // Show Skill Group
            elSkillGroup.FindChildInLayoutFile('JsPlayerSkillIcon').SetImage('file://{images}/icons/skillgroups/' + imageName + skillGroup + '.svg');
            if (bNonPrimeButHasXpProgress) {
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_locked');
            }
            else {
                let skillGroupNamingSuffix = (typeModifier && typeModifier !== 'wingman') ? typeModifier : '';
                elSkillGroup.FindChildInLayoutFile('JsPlayerSkillLabel').text = $.Localize('#skillgroup_' + skillGroup + skillGroupNamingSuffix);
            }
            if (_m_isSelf)
                tooltipText = bNonPrimeButHasXpProgress ? $.Localize('#tooltip_skill_group_locked') : $.Localize('#tooltip_skill_group_generic' + typeModifier);
        }
        let tooltipLoc = elSkillGroup.id;
        if (bNonPrimeButHasXpProgress) {
            tooltipText = (tooltipText !== '') ? tooltipText : '';
        }
        else {
            tooltipText = (tooltipText !== '') ? tooltipText + '<br><br>' + GetMatchWinsText(elSkillGroup, wins) : GetMatchWinsText(elSkillGroup, wins);
        }
        elSkillGroup.RemoveClass('hidden');
        if (!isloading) {
            elSkillGroup.SetPanelEvent('onmouseover', ShowSkillGroupTooltip.bind(undefined, tooltipLoc, tooltipText));
            elSkillGroup.SetPanelEvent('onmouseout', HideSkillGroupTooltip);
        }
        elSkillGroup.SetHasClass('player-card-nonprime-locked-xp-row', _m_ShowLockedRankSkillGroupState);
    }
    ;
    //}DEVONLY
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
        // Since we fetch he rank for you and we don't want to do it on load
        // we hide it when we make the panel.
        // If its not the profile inthe friends panel then we are asking for it anyway by opening 
        // So default both ranks to show.
        let elToggleBtn = $.GetContextPanel().FindChildInLayoutFile('SkillGroupExpand');
        if (type !== 'Competitive' && _m_bShownInFriendsList) {
            elSkillGroup.AddClass('collapsed');
            return;
        }
        elToggleBtn.visible = _m_bShownInFriendsList ? true : false;
        // If its your other rank we are asking for and this is not for the friendslist panel then 
        // ask for the rank.
        if (!_m_bShownInFriendsList && _m_isSelf) {
            _AskForLocalPlayersAdditionalSkillGroups();
        }
    }
    ;
    function _AskForLocalPlayersAdditionalSkillGroups() {
        let hintLoadSkillGroups = '';
        // If we get back -1 then we are looking at our own rank so we need to load it.
        _m_arrAdditionalSkillGroups.forEach(type => {
            if (FriendsListAPI.GetFriendCompetitiveRank(_m_xuid, type) === -1) {
                hintLoadSkillGroups += (hintLoadSkillGroups ? ',' : '') + type;
            }
        });
        // Hint load the entire batch
        if (hintLoadSkillGroups) {
            MyPersonaAPI.HintLoadPipRanks(hintLoadSkillGroups);
        }
        // Create the panels
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
        // For a limited time if you have more that level 2xp or prestige but are not prime we will show you your actual rank in a hidden state
        // So here we will hide the upsell versions of the XP and Skillgroup.
        // This is so you can see the locked xpo and rank for you for a limited time. 
        // Allows users to see thier progress nonprime and transfer it to Prime for a limited time.
        // Uncomment the retrun when that grace period is over.
        // return;
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
            //$.Msg('Player Card Commends: ' + catagories[i].key +': ' + catagories[i].value );
            let elCommend = $.GetContextPanel().FindChildInLayoutFile('JsPlayer' + catagories[i].key);
            // Are there any commends for this catagory.
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
        // Hiding this from here is now rolled into rank tooltip
        // let wins = FriendsListAPI.GetFriendCompetitiveWins( _m_xuid, "Competitive" );
        // //$.Msg('Player Card wins: ' + wins );
        // if ( !wins || wins === 0 )
        // {
        // 	$.GetContextPanel().FindChildInLayoutFile( 'JsPlayerWins' ).AddClass( 'hidden' );
        // 	countHiddenCommends++;
        // }
        // else
        // {
        // 	$.GetContextPanel().FindChildInLayoutFile( 'JsPlayerWins' ).RemoveClass( 'hidden' );
        // 	$.GetContextPanel().FindChildInLayoutFile( 'JsPlayerWins' ).FindChild( 'JsCommendLabel' ).text = wins;
        // }
        // If there are no commends then hide the panel. This counts 'wins'
        elCommendsBlock.SetHasClass('hidden', countHiddenCommends === catagoriesCount && !_IsPlayerPrime());
        return countHiddenCommends === catagoriesCount;
    }
    ;
    function _SetPrime(bHasNoCommendsToShow) {
        let elPrime = $.GetContextPanel().FindChildInLayoutFile('JsPlayerPrime');
        // Player is Prime so show the element
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
        // Show team hide team panel
        if (!teamName || !tournamentName) {
            $.GetContextPanel().FindChildInLayoutFile('JsPlayerTeam').AddClass('hidden');
            return;
        }
        // Hide matchmaking stats and show tournament team panel
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
        // Get the total number of flair items in our inventory.
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
        // Clean up and remove items in this list before making any new panels.
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
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created 
//--------------------------------------------------------------------------------------------------
(function () {
    if ($.DbgIsReloadingScript()) {
        $.Msg("Playercard reloaded\n ");
    }
    playerCard.Init();
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', playerCard.FillOutFriendCard);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_NameChanged', playerCard.UpdateName);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_ProfileUpdated', playerCard.ProfileUpdated);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', playerCard.SetAllSkillGroups);
    $.RegisterForUnhandledEvent("PanoramaComponent_Lobby_PlayerUpdated", playerCard.UpdateAvatar);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', playerCard.FriendsListUpdateName);
    //$.RegisterForUnhandledEvent( 'PanoramaComponent_Device_Reset', playerCard.setAvatar() );
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyY2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYXllcmNhcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw4Q0FBOEM7QUFDOUMseUNBQXlDO0FBQ3pDLGtDQUFrQztBQUVsQyxJQUFVLFVBQVUsQ0E4ekJuQjtBQTl6QkQsV0FBVSxVQUFVO0lBR25CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLGFBQWEsR0FBa0IsSUFBSSxDQUFDO0lBQ3hDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztJQUN0QixJQUFJLHNCQUFzQixHQUFHLEtBQUssQ0FBQztJQUNuQyxJQUFJLHFCQUFxQixHQUFlLElBQUksQ0FBQztJQUM3QyxJQUFJLDJCQUEyQixHQUFHLENBQUUsU0FBUyxFQUFDLFlBQVksQ0FBRSxDQUFDO0lBQzdELElBQUksMEJBQTBCLEdBQWtCLElBQUksQ0FBQztJQUNyRCxJQUFJLGdDQUFnQyxHQUFHLEtBQUssQ0FBQztJQUM3QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFHaEMsU0FBUyxJQUFJLENBQUcsSUFBVztRQUUxQixDQUFDLENBQUMsR0FBRyxDQUFFLGlCQUFpQixHQUFHLElBQUksQ0FBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxTQUFnQixJQUFJO1FBRW5CLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBRSxDQUFDO1FBQzVFLFNBQVMsR0FBRyxPQUFPLEtBQUssWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUM5RCxzQkFBc0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQztRQUV4RixDQUFDLENB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