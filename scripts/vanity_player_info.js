"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="avatar.ts" />
/// <reference path="common/sessionutil.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="rating_emblem.ts" />
var VanityPlayerInfo;
(function (VanityPlayerInfo) {
    function _msg(text) {
        $.Msg('vanity_player_info.ts ' + text);
    }
    function CreateOrUpdateVanityInfoPanel(elParent = null, oSettings = null) {
        if (!elParent) {
            elParent = $.GetContextPanel();
        }
        const idPrefix = "id-player-vanity-info-" + oSettings.playeridx;
        let newPanel = elParent.FindChildInLayoutFile(idPrefix);
        if (!newPanel) {
            newPanel = $.CreatePanel('Button', elParent, idPrefix);
            newPanel.BLoadLayout('file://{resources}/layout/vanity_player_info.xml', false, false);
            newPanel.AddClass('vanity-info-loc-' + oSettings.playeridx);
            newPanel.AddClass('show');
        }
        // $.Msg( 'oSettings' + JSON.stringify( oSettings ));
        _SetName(newPanel, oSettings.xuid);
        _SetAvatar(newPanel, oSettings.xuid);
        _SetRank(newPanel, oSettings.xuid, oSettings.isLocalPlayer);
        _SetSkillGroup(newPanel, oSettings.xuid, oSettings.isLocalPlayer);
        //DEVONLY{
        //_SetSkillGroupOld( newPanel, oSettings.xuid, oSettings.isLocalPlayer );
        //}DEVONLY
        _SetPrime(newPanel, oSettings.xuid, oSettings.isLocalPlayer);
        _AddOpenPlayerCardAction(newPanel.FindChildInLayoutFile('vanity-info-container'), oSettings.xuid);
        _SetLobbyLeader(newPanel, oSettings.xuid);
        return newPanel;
    }
    VanityPlayerInfo.CreateOrUpdateVanityInfoPanel = CreateOrUpdateVanityInfoPanel;
    ;
    function DeleteVanityInfoPanel(elParent, index) {
        const idPrefix = "id-player-vanity-info-" + index;
        const elPanel = elParent.FindChildInLayoutFile(idPrefix);
        if (elPanel && elPanel.IsValid()) {
            elPanel.DeleteAsync(0);
        }
    }
    VanityPlayerInfo.DeleteVanityInfoPanel = DeleteVanityInfoPanel;
    ;
    function _RoundToPixel(context, value, axis) {
        const scale = axis === "x" ? context.actualuiscale_x : context.actualuiscale_y;
        return Math.round(value * scale) / scale;
    }
    ;
    function SetVanityInfoPanelPos(elParent, index, oPos, OnlyXOrY) {
        const idPrefix = "id-player-vanity-info-" + index;
        const elPanel = elParent.FindChildInLayoutFile(idPrefix);
        if (elPanel && elPanel.IsValid()) {
            switch (OnlyXOrY) {
                case 'x':
                    elPanel.style.transform = 'translateX( ' + oPos.x + 'px );';
                    break;
                case 'y':
                    elPanel.style.transform = 'translateY( ' + oPos.x + 'px );';
                    break;
                default:
                    elPanel.style.transform = 'translate3d( ' + _RoundToPixel(elParent, oPos.x, "x") + 'px, ' + _RoundToPixel(elParent, oPos.y, "y") + 'px, 0px );';
                    break;
            }
            //elPanel.style.position = oPos.x + "px " + oPos.y + "px 0px";
        }
    }
    VanityPlayerInfo.SetVanityInfoPanelPos = SetVanityInfoPanelPos;
    ;
    // individual elements
    function _SetName(newPanel, xuid) {
        const name = MockAdapter.IsFakePlayer(xuid)
            ? MockAdapter.GetPlayerName(xuid)
            : FriendsListAPI.GetFriendName(xuid);
        newPanel.SetDialogVariable('player_name', name);
        //$.Msg( 'Name '+ xuid +': ' + FriendsListAPI.GetFriendName( xuid ) );
    }
    ;
    function _SetAvatar(newPanel, xuid) {
        const elParent = newPanel.FindChildInLayoutFile('vanity-avatar-container');
        let elAvatar = elParent.FindChildInLayoutFile('JsPlayerVanityAvatar-' + xuid);
        if (!elAvatar) {
            elAvatar = $.CreatePanel("Panel", elParent, 'JsPlayerVanityAvatar-' + xuid);
            elAvatar.SetAttributeString('xuid', xuid);
            elAvatar.BLoadLayout('file://{resources}/layout/avatar.xml', false, false);
            elAvatar.BLoadLayoutSnippet("AvatarPlayerCard");
            elAvatar.AddClass('avatar--vanity');
        }
        //$.DispatchEvent( 'InitAvatar', elAvatar, _m_xuid, 'PlayerCard' );
        Avatar.Init(elAvatar, xuid, 'playercard');
        if (MockAdapter.IsFakePlayer(xuid)) {
            const elAvatarImage = elAvatar.FindChildInLayoutFile("JsAvatarImage");
            elAvatarImage.PopulateFromPlayerSlot(MockAdapter.GetPlayerSlot(xuid));
        }
    }
    ;
    function _SetRank(newPanel, xuid, isLocalPlayer) {
        // $.Msg('Player Card currentLvl: ' + _m_currentLvl );
        // $.Msg('Player Card _HasXpProgressToFreeze(): ' + _HasXpProgressToFreeze() );
        // $.Msg('Player Card _IsPlayerPrime(): ' + _IsPlayerPrime() );
        // $.Msg('MyPersonaAPI.IsInventoryValid(): ' + MyPersonaAPI.IsInventoryValid() );
        const elRankText = newPanel.FindChildInLayoutFile('vanity-rank-name');
        const elRankIcon = newPanel.FindChildInLayoutFile('vanity-xp-icon');
        const elXpBarInner = newPanel.FindChildInLayoutFile('vanity-xp-bar-inner');
        // Commenting out since we only want to show XP for local players. 
        // if ( !isLocalPlayer && MyPersonaAPI.IsInventoryValid() )
        // {
        // 	_SetRankFromParty( newPanel, elRankText, elRankIcon, elXpBarInner, xuid );
        // 	return;
        // }
        if (!isLocalPlayer || !MyPersonaAPI.IsInventoryValid()) {
            newPanel.FindChildInLayoutFile('vanity-xp-container').visible = false;
            return;
        }
        newPanel.FindChildInLayoutFile('vanity-xp-container').visible = true;
        const currentLvl = FriendsListAPI.GetFriendLevel(xuid);
        // const elRank = $.GetContextPanel().FindChildInLayoutFile( 'JsPlayerXp' );
        if (!MyPersonaAPI.IsInventoryValid() ||
            !currentLvl ||
            (!_HasXpProgressToFreeze() && !_IsPlayerPrime(xuid))
        // || ( !_IsPlayerPrime() && !isLocalPlayer )
        ) {
            newPanel.AddClass('no-valid-xp');
            return;
        }
        const bHasRankToFreezeButNoPrestige = (!_IsPlayerPrime(xuid) && _HasXpProgressToFreeze()) ? true : false;
        const currentPoints = FriendsListAPI.GetFriendXp(xuid), pointsPerLevel = MyPersonaAPI.GetXpPerLevel();
        // Set Xp bar and show.
        if (bHasRankToFreezeButNoPrestige) {
            elXpBarInner.GetParent().visible = false;
        }
        else {
            const percentComplete = (currentPoints / pointsPerLevel) * 100;
            elXpBarInner.style.width = percentComplete + '%';
            elXpBarInner.GetParent().visible = true;
        }
        // if the rank is frozen, use the same styling as the upsell non-prime case
        elRankText.SetHasClass('player-card-prime-text', bHasRankToFreezeButNoPrestige);
        // elRank.SetHasClass( 'player-card-nonprime-locked-xp-row', bHasRankToFreezeButNoPrestige );
        if (bHasRankToFreezeButNoPrestige) {
            elRankText.text = $.Localize('#Xp_RankName_Locked');
        }
        else {
            elRankText.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + currentLvl));
            elRankText.SetDialogVariableInt('level', currentLvl);
        }
        // Set Xp rank image and show.
        elRankIcon.SetImage('file://{images}/icons/xp/level' + currentLvl + '.png');
        newPanel.RemoveClass('no-valid-xp');
        // const bPrestigeAvailable = isSelf && ( currentLvl >= InventoryAPI.GetMaxLevel() );
        // $.GetContextPanel().FindChildInLayoutFile( 'GetPrestigeButton' ).SetHasClass( 'hidden', !bPrestigeAvailable );
        // if ( bPrestigeAvailable )
        // {
        // 	$.GetContextPanel().FindChildInLayoutFile( 'GetPrestigeButtonClickable' ).SetPanelEvent(
        // 		'onactivate',
        // 		_OnActivateGetPrestigeButtonClickable
        // 	);
        // }
    }
    ;
    function _SetRankFromParty(newPanel, elRankText, elRankIcon, elXpBarInner, xuid) {
        const rankLvl = PartyListAPI.GetFriendLevel(xuid);
        const xpPoints = PartyListAPI.GetFriendXp(xuid);
        const pointsPerLevel = MyPersonaAPI.GetXpPerLevel();
        if (!rankLvl) {
            newPanel.AddClass('no-valid-xp');
            return;
        }
        const percentComplete = (xpPoints / pointsPerLevel) * 100;
        elXpBarInner.style.width = percentComplete + '%';
        elXpBarInner.GetParent().visible = true;
        elRankIcon.SetImage('file://{images}/icons/xp/level' + rankLvl + '.png');
        elRankText.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + rankLvl));
        elRankText.SetDialogVariableInt('level', rankLvl);
        newPanel.RemoveClass('no-valid-xp');
    }
    ;
    function _SetSkillGroup(newPanel, xuid, isLocalPlayer) {
        let options = {
            root_panel: newPanel,
            xuid: xuid,
            api: 'mypersona',
            rating_type: 'Competitive'
        };
        let haveRating = RatingEmblem.SetXuid(options);
        let showRating = haveRating || MyPersonaAPI.GetXuid() === xuid;
        //	newPanel.visible = showRating;
        newPanel.SetDialogVariable('rating-text', RatingEmblem.GetRatingDesc(newPanel));
    }
    ;
    //DEVONLY{
    function _SetSkillGroupOld(newPanel, xuid, isLocalPlayer) {
        // Skill group is frozen, use the same styling as the upsell non-prime case
        const elImage = newPanel.FindChildInLayoutFile('vanity-skillgroup-icon');
        const elLabel = newPanel.FindChildInLayoutFile('vanity-skillgroup-label');
        if (!isLocalPlayer) {
            _SetSkillGroupFromParty(newPanel, elImage, elLabel, xuid);
            return;
        }
        if (!_IsPlayerPrime(xuid) && _HasXpProgressToFreeze()) {
            // locked skill groups no need to show others
            return;
        }
        $.Msg(' ....rank----------------------');
        const type = "Competitive";
        const skillGroup = FriendsListAPI.GetFriendCompetitiveRank(xuid, type);
        const isloading = (skillGroup === -1) ? true : false;
        if (isloading) {
            // do stuff here
            return;
        }
        const winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(type);
        const wins = FriendsListAPI.GetFriendCompetitiveWins(xuid, type);
        // Not enough wins for a skillGroup
        if (wins < winsNeededForRank) {
            const winsneeded = (winsNeededForRank - wins);
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup_none.svg');
            elLabel.text = $.Localize('#skillgroup_0');
            elLabel.SetDialogVariableInt("winsneeded", winsneeded);
            // tooltipText = $.Localize( '#tooltip_skill_group_none', elSkillGroup.FindChildInLayoutFile( 'JsPlayerSkillLabel' ) );
        }
        else if (wins >= winsNeededForRank && skillGroup < 1) {
            // Skill group expired. No need to show for others
            if (!isLocalPlayer)
                return;
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup_expired.svg');
            // elLabel.SetDialogVariableInt( "winsneeded", winsneeded );
            elLabel.text = $.Localize('#skillgroup_expired');
        }
        else {
            // show skill group
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup' + skillGroup + '.svg');
            elLabel.text = $.Localize('#skillgroup_' + skillGroup);
        }
    }
    ;
    function _SetSkillGroupFromParty(newPanel, elImage, elLabel, xuid) {
        const skillgroupType = PartyListAPI.GetFriendCompetitiveRankType(xuid);
        const skillGroup = PartyListAPI.GetFriendCompetitiveRank(xuid); // skillgroupType );
        const wins = PartyListAPI.GetFriendCompetitiveWins(xuid); // skillgroupType );
        const winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(skillgroupType);
        //$.Msg( '_SetPartyMemberRank type=' + skillgroupType + ' xuid=' + xuid + ' wins=' + wins + ' needed=' + winsNeededForRank + ' skill=' + skillGroup );
        if (wins < winsNeededForRank || (wins >= winsNeededForRank && skillGroup < 1) || !PartyListAPI.GetFriendPrimeEligible(xuid)) {
            newPanel.AddClass('no-valid-rank');
            return;
        }
        const imageName = (skillgroupType !== 'Competitive') ? skillgroupType : 'skillgroup';
        elImage.SetImage('file://{images}/icons/skillgroups/' + imageName + skillGroup + '.svg');
        elLabel.text = $.Localize('#skillgroup_' + skillGroup);
        newPanel.RemoveClass('no-valid-rank');
    }
    ;
    //}DEVONLY
    function _SetPrime(elPanel, xuid, isLocalPlayer) {
        const elPrime = elPanel.FindChildInLayoutFile('vanity-prime-icon');
        elPrime.visible = isLocalPlayer ? _IsPlayerPrime(xuid) : PartyListAPI.GetFriendPrimeEligible(xuid);
    }
    ;
    function UpdateVoiceIcon(elAvatar, xuid) {
        Avatar.UpdateTalkingState(elAvatar, xuid);
    }
    VanityPlayerInfo.UpdateVoiceIcon = UpdateVoiceIcon;
    ;
    function _HasXpProgressToFreeze() {
        return MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() > 2);
    }
    ;
    function _IsPlayerPrime(xuid) {
        return FriendsListAPI.GetFriendPrimeEligible(xuid);
    }
    ;
    function _SetLobbyLeader(elPanel, xuid) {
        elPanel.SetHasClass('is-not-leader', LobbyAPI.GetHostSteamID() !== xuid);
    }
    ;
    function _AddOpenPlayerCardAction(elPanel, xuid) {
        function openCard(xuid) {
            if (xuid !== "0") {
                const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, function () {
                });
                contextMenuPanel.AddClass("ContextMenu_NoArrow");
            }
        }
        ;
        elPanel.SetPanelEvent("onactivate", openCard.bind(undefined, xuid));
    }
    ;
    function updateProfile(xuid) {
        if (m_oSettings && m_oSettings.xuid === xuid) {
            CreateOrUpdateVanityInfoPanel();
        }
    }
    VanityPlayerInfo.updateProfile = updateProfile;
})(VanityPlayerInfo || (VanityPlayerInfo = {}));
(function () {
    if ($.DbgIsReloadingScript()) {
        $.Msg("Vanity player reloaded\n ");
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFuaXR5X3BsYXllcl9pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmFuaXR5X3BsYXllcl9pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyx3Q0FBd0M7QUFDeEMseUNBQXlDO0FBVXpDLElBQVUsZ0JBQWdCLENBNlh6QjtBQTdYRCxXQUFVLGdCQUFnQjtJQUd6QixTQUFTLElBQUksQ0FBRyxJQUFZO1FBRTNCLENBQUMsQ0FBQyxHQUFHLENBQUUsd0JBQXdCLEdBQUcsSUFBSSxDQUFFLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQWdCLDZCQUE2QixDQUFHLFdBQXlCLElBQUksRUFBRSxZQUE0QyxJQUFJO1FBRzlILElBQUssQ0FBQyxRQUFRLEVBQ2Q7WUFDQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1NBQy9CO1FBRUQsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLEdBQUcsU0FBVSxDQUFDLFNBQVMsQ0FBQztRQUNqRSxJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMscUJBQXFCLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFMUQsSUFBSyxDQUFDLFFBQVEsRUFDZDtZQUNDLFFBQVEsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFFLENBQUM7WUFDekQsUUFBUSxDQUFDLFdBQVcsQ0FBRSxrREFBa0QsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFFLENBQUM7WUFDekYsUUFBUSxDQUFDLFFBQVEsQ0FBRSxrQkFBa0IsR0FBRyxTQUFVLENBQUMsU0FBUyxDQUFFLENBQUM7WUFDL0QsUUFBUSxDQUFDLFFBQVEsQ0FBRSxNQUFNLENBQUUsQ0FBQztTQUM1QjtRQUVELHFEQUFxRDtRQUVyRCxRQUFRLENBQUUsUUFBUSxFQUFFLFNBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUN0QyxVQUFVLENBQUUsUUFB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