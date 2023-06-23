/// <reference path="csgo.d.ts" />
/// <reference path="avatar.ts" />
/// <reference path="common/sessionutil.ts" />
/// <reference path="mock_adapter.ts" />
var VanityPlayerInfo = (function () {
    const _CreateUpdateVanityInfoPanel = function (elParent, oSettings, XML = 'file://{resources}/layout/vanity_player_info.xml') {
        const idPrefix = "id-player-vanity-info-" + oSettings.playeridx;
        let newPanel = elParent.FindChildInLayoutFile(idPrefix);
        if (!newPanel) {
            newPanel = $.CreatePanel('Button', elParent, idPrefix);
            newPanel.BLoadLayout(XML, false, false);
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
    };
    const _DeleteVanityInfoPanel = function (elParent, index) {
        const idPrefix = "id-player-vanity-info-" + index;
        const elPanel = elParent.FindChildInLayoutFile(idPrefix);
        if (elPanel && elPanel.IsValid()) {
            elPanel.DeleteAsync(0);
        }
    };
    const _RoundToPixel = function (context, value, axis) {
        const scale = axis === "x" ? context.actualuiscale_x : context.actualuiscale_y;
        return Math.round(value * scale) / scale;
    };
    const _SetVanityInfoPanelPos = function (elParent, index, oPos, OnlyXOrY) {
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
    };
    const _SetName = function (newPanel, xuid) {
        const name = MockAdapter.IsFakePlayer(xuid)
            ? MockAdapter.GetPlayerName(xuid)
            : FriendsListAPI.GetFriendName(xuid);
        newPanel.SetDialogVariable('player_name', name);
    };
    const _SetAvatar = function (newPanel, xuid) {
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
    };
    const _SetRank = function (newPanel, xuid, isLocalPlayer) {
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
    };
    const _SetRankFromParty = function (newPanel, elRankText, elRankIcon, elXpBarInner, xuid) {
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
    };
    const _SetSkillGroup = function (newPanel, xuid, isLocalPlayer) {
        const elImage = newPanel.FindChildInLayoutFile('vanity-skillgroup-icon');
        const elLabel = newPanel.FindChildInLayoutFile('vanity-skillgroup-label');
        if (!isLocalPlayer) {
            _SetSkillGroupFromParty(newPanel, elImage, elLabel, xuid);
            return;
        }
        if (!_IsPlayerPrime(xuid) && _HasXpProgressToFreeze()) {
            return;
        }
        const type = "Competitive";
        const skillGroup = FriendsListAPI.GetFriendCompetitiveRank(xuid, type);
        const isloading = (skillGroup === -1) ? true : false;
        if (isloading) {
            return;
        }
        const winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(type);
        const wins = FriendsListAPI.GetFriendCompetitiveWins(xuid, type);
        if (wins < winsNeededForRank) {
            const winsneeded = (winsNeededForRank - wins);
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup_none.svg');
            elLabel.text = $.Localize('#skillgroup_0');
            elLabel.SetDialogVariableInt("winsneeded", winsneeded);
        }
        else if (wins >= winsNeededForRank && skillGroup < 1) {
            if (!isLocalPlayer)
                return;
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup_expired.svg');
            elLabel.text = $.Localize('#skillgroup_expired');
        }
        else {
            elImage.SetImage('file://{images}/icons/skillgroups/skillgroup' + skillGroup + '.svg');
            elLabel.text = $.Localize('#skillgroup_' + skillGroup);
        }
    };
    const _SetSkillGroupFromParty = function (newPanel, elImage, elLabel, xuid) {
        const skillgroupType = PartyListAPI.GetFriendCompetitiveRankType(xuid);
        const skillGroup = PartyListAPI.GetFriendCompetitiveRank(xuid);
        const wins = PartyListAPI.GetFriendCompetitiveWins(xuid);
        const winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(skillgroupType);
        if (wins < winsNeededForRank || (wins >= winsNeededForRank && skillGroup < 1) || !PartyListAPI.GetFriendPrimeEligible(xuid)) {
            newPanel.AddClass('no-valid-rank');
            return;
        }
        const imageName = (skillgroupType !== 'Competitive') ? skillgroupType : 'skillgroup';
        elImage.SetImage('file://{images}/icons/skillgroups/' + imageName + skillGroup + '.svg');
        elLabel.text = $.Localize('#skillgroup_' + skillGroup);
        newPanel.RemoveClass('no-valid-rank');
    };
    const _SetPrime = function (elPanel, xuid, isLocalPlayer) {
        const elPrime = elPanel.FindChildInLayoutFile('vanity-prime-icon');
        elPrime.visible = isLocalPlayer ? _IsPlayerPrime(xuid) : PartyListAPI.GetFriendPrimeEligible(xuid);
    };
    const _UpdateVoiceIcon = function (elAvatar, xuid) {
        Avatar.UpdateTalkingState(elAvatar, xuid);
    };
    const _HasXpProgressToFreeze = function () {
        return MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() > 2);
    };
    const _IsPlayerPrime = function (xuid) {
        return FriendsListAPI.GetFriendPrimeEligible(xuid);
    };
    const _SetLobbyLeader = function (elPanel, xuid) {
        elPanel.SetHasClass('is-not-leader', LobbyAPI.GetHostSteamID() !== xuid);
    };
    const _AddOpenPlayerCardAction = function (elPanel, xuid) {
        const openCard = function (xuid) {
            if (xuid !== "0") {
                const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, function () {
                });
                contextMenuPanel.AddClass("ContextMenu_NoArrow");
            }
        };
        elPanel.SetPanelEvent("onactivate", openCard.bind(undefined, xuid));
    };
    return {
        CreateUpdateVanityInfoPanel: _CreateUpdateVanityInfoPanel,
        DeleteVanityInfoPanel: _DeleteVanityInfoPanel,
        SetVanityInfoPanelPos: _SetVanityInfoPanelPos,
        UpdateVoiceIcon: _UpdateVoiceIcon
    };
})();
(function () {
    if ($.DbgIsReloadingScript()) {
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFuaXR5X3BsYXllcl9pbmZvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmFuaXR5X3BsYXllcl9pbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQyxrQ0FBa0M7QUFDbEMsOENBQThDO0FBQzlDLHdDQUF3QztBQVN4QyxJQUFJLGdCQUFnQixHQUFHLENBQUU7SUFFeEIsTUFBTSw0QkFBNEIsR0FBRyxVQUFXLFFBQWlCLEVBQUUsU0FBb0MsRUFBRSxHQUFHLEdBQUcsa0RBQWtEO1FBVWhLLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7UUFDaEUsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBRTFELElBQUssQ0FBQyxRQUFRLEVBQ2Q7WUFDQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1lBQ3pELFFBQVEsQ0FBQyxXQUFXLENBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUUsQ0FBQztZQUMxQyxRQUFRLENBQUMsUUFBUSxDQUFFLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUUsQ0FBQztZQUM5RCxRQUFRLENBQUMsUUFBUSxDQUFFLE1BQU0sQ0FBRSxDQUFDO1NBQzVCO1FBSUQsUUFBUSxDQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFFLENBQUM7UUFDckMsVUFBVSxDQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFFLENBQUM7UUFDdkMsUUFBUSxDQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUUsQ0FBQztRQUM5RCxjQUFjLENBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLGFBQWEsQ0FBRSxDQUFDO1FBQ3BFLFNBQVMsQ0FB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