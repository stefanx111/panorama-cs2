"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="avatar.ts" />
/// <reference path="common/sessionutil.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="rating_emblem.ts" />
var VanityPlayerInfo;
(function (VanityPlayerInfo) {
    function _msg(text) {
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
        _SetName(newPanel, oSettings.xuid);
        _SetAvatar(newPanel, oSettings.xuid);
        _SetRank(newPanel, oSettings.xuid, oSettings.isLocalPlayer);
        _SetSkillGroup(newPanel, oSettings.xuid, oSettings.isLocalPlayer);
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
        }
    }
    VanityPlayerInfo.SetVanityInfoPanelPos = SetVanityInfoPanelPos;
    ;
    function _SetName(newPanel, xuid) {
        const name = MockAdapter.IsFakePlayer(xuid)
            ? MockAdapter.GetPlayerName(xuid)
            : FriendsListAPI.GetFriendName(xuid);
        newPanel.SetDialogVariable('player_name', name);
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
        Avatar.Init(elAvatar, xuid, 'playercard');
        if (MockAdapter.IsFakePlayer(xuid)) {
            const elAvatarImage = elAvatar.FindChildInLayoutFile("JsAvatarImage");
            elAvatarImage.PopulateFromPlayerSlot(MockAdapter.GetPlayerSlot(xuid));
        }
    }
    ;
    function _SetRank(newPanel, xuid, isLocalPlayer) {
        const elRankText = newPanel.FindChildInLayoutFile('vanity-rank-name');
        const elRankIcon = newPanel.FindChildInLayoutFile('vanity-xp-icon');
        const elXpBarInner = newPanel.FindChildInLayoutFile('vanity-xp-bar-inner');
        if (!isLocalPlayer || !MyPersonaAPI.IsInventoryValid()) {
            newPanel.FindChildInLayoutFile('vanity-xp-container').visible = false;
            return;
        }
        newPanel.FindChildInLayoutFile('vanity-xp-container').visible = true;
        const currentLvl = FriendsListAPI.GetFriendLevel(xuid);
        if (!MyPersonaAPI.IsInventoryValid() ||
            !currentLvl ||
            (!_HasXpProgressToFreeze() && !_IsPlayerPrime(xuid))) {
            newPanel.AddClass('no-valid-xp');
            return;
        }
        const bHasRankToFreezeButNoPrestige = (!_IsPlayerPrime(xuid) && _HasXpProgressToFreeze()) ? true : false;
        const currentPoints = FriendsListAPI.GetFriendXp(xuid), pointsPerLevel = MyPersonaAPI.GetXpPerLevel();
        if (bHasRankToFreezeButNoPrestige) {
            elXpBarInner.GetParent().visible = false;
        }
        else {
            const percentComplete = (currentPoints / pointsPerLevel) * 100;
            elXpBarInner.style.width = percentComplete + '%';
            elXpBarInner.GetParent().visible = true;
        }
        elRankText.SetHasClass('player-card-prime-text', bHasRankToFreezeButNoPrestige);
        if (bHasRankToFreezeButNoPrestige) {
            elRankText.text = $.Localize('#Xp_RankName_Locked');
        }
        else {
            elRankText.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + currentLvl));
            elRankText.SetDialogVariableInt('level', currentLvl);
        }
        elRankIcon.SetImage('file://{images}/icons/xp/level' + currentLvl + '.png');
        newPanel.RemoveClass('no-valid-xp');
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
        newPanel.SetDialogVariable('rating-text', RatingEmblem.GetRatingDesc(newPanel));
    }
    ;
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
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFuaXR5X3BsYXllcl9pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmFuaXR5X3BsYXllcl9pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyx3Q0FBd0M7QUFDeEMseUNBQXlDO0FBVXpDLElBQVUsZ0JBQWdCLENBNlh6QjtBQTdYRCxXQUFVLGdCQUFnQjtJQUd6QixTQUFTLElBQUksQ0FBRyxJQUFZO0lBRzVCLENBQUM7SUFFRCxTQUFnQiw2QkFBNkIsQ0FBRyxXQUF5QixJQUFJLEVBQUUsWUFBNEMsSUFBSTtRQUc5SCxJQUFLLENBQUMsUUFBUSxFQUNkO1lBQ0MsUUFBUSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUMvQjtRQUVELE1BQU0sUUFBUSxHQUFHLHdCQUF3QixHQUFHLFNBQVUsQ0FBQyxTQUFTLENBQUM7UUFDakUsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBRTFELElBQUssQ0FBQyxRQUFRLEVBQ2Q7WUFDQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1lBQ3pELFFBQVEsQ0FBQyxXQUFXLENBQUUsa0RBQWtELEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBRSxDQUFDO1lBQ3pGLFFBQVEsQ0FBQyxRQUFRLENBQUUsa0JBQWtCLEdBQUcsU0FBVSxDQUFDLFNBQVMsQ0FBRSxDQUFDO1lBQy9ELFFBQVEsQ0FBQyxRQUFRLENBQUUsTUFBTSxDQUFFLENBQUM7U0FDNUI7UUFJRCxRQUFRLENBQUUsUUFBUSxFQUFFLFNBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUN0QyxVQUFVLENBQUUsUUFBUSxFQUFFLFNBQVUsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUN4QyxRQUFRLENBQUUsUUFBUSxFQUFFLFNBQVUsQ0FB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