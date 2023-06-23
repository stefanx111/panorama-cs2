/// <reference path="../csgo.d.ts" />
var CommonUtil = (function () {
    const remap_lang_to_region = {
        af: 'za',
        ar: 'sa',
        be: 'by',
        cs: 'cz',
        da: 'dk',
        el: 'gr',
        en: 'gb',
        et: 'ee',
        ga: 'ie',
        he: 'il',
        hi: 'in',
        ja: 'jp',
        kk: 'kz',
        ko: 'kr',
        nn: 'no',
        sl: 'si',
        sr: 'rs',
        sv: 'se',
        uk: 'ua',
        ur: 'pk',
        vi: 'vn',
        zh: 'cn',
        zu: 'za',
    };
    function _SetRegionOnLabel(isoCode, elPanel, tooltip = true) {
        let tooltipString = "";
        if (isoCode) {
            tooltipString = $.Localize("#SFUI_Country_" + isoCode.toUpperCase());
        }
        _SetDataOnLabelInternal(isoCode, isoCode, tooltip ? tooltipString : "", elPanel, tooltipString ? false : true);
    }
    function _SetLanguageOnLabel(isoCode, elPanel, tooltip = true) {
        let tooltipString = "";
        let imgCode = isoCode;
        if (isoCode) {
            const sTranslated = $.Localize("#Language_Name_Translated_" + isoCode);
            const sLocal = $.Localize("#Language_Name_Native_" + isoCode);
            if (sTranslated && sLocal && sTranslated === sLocal) {
                tooltipString = sLocal;
            }
            else {
                tooltipString = (sTranslated && sLocal) ? sTranslated + " (" + sLocal + ")" : "";
            }
            if (remap_lang_to_region[isoCode]) {
                imgCode = remap_lang_to_region[isoCode];
            }
        }
        _SetDataOnLabelInternal(isoCode, imgCode, tooltip ? tooltipString : "", elPanel, tooltipString ? false : true);
    }
    function _SetDataOnLabelInternal(isoCode, imgCode, tooltipString, elPanel, bWarningColor) {
        if (!elPanel)
            return;
        const elLabel = elPanel.FindChildTraverse('JsRegionLabel');
        elLabel.AddClass('visible-if-not-perfectworld');
        if (isoCode) {
            elLabel.text = isoCode.toUpperCase();
            elLabel.style.backgroundImage = 'url("file://{images}/regions/' + imgCode + '.png")';
            let elTTAnchor = elLabel.FindChildTraverse('region-tt-anchor');
            if (!elTTAnchor) {
                elTTAnchor = $.CreatePanel("Panel", elLabel, elPanel.id + '-region-tt-anchor');
            }
            if (tooltipString) {
                elLabel.SetPanelEvent('onmouseover', () => UiToolkitAPI.ShowTextTooltip(elTTAnchor.id, tooltipString));
                elLabel.SetPanelEvent('onmouseout', () => UiToolkitAPI.HideTextTooltip());
            }
            elLabel.RemoveClass('hidden');
            elLabel.SetHasClass('world-region-label', true);
            elLabel.SetHasClass('world-region-label--image', true);
        }
        else {
            elLabel.AddClass('hidden');
            elLabel.SetHasClass('world-region-label', false);
            elLabel.SetHasClass('world-region-label--image', false);
        }
    }
    return {
        SetRegionOnLabel: _SetRegionOnLabel,
        SetLanguageOnLabel: _SetLanguageOnLabel,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9udXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbW1vbnV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscUNBQXFDO0FBSXJDLElBQUksVUFBVSxHQUFHLENBQUU7SUFLbEIsTUFBTSxvQkFBb0IsR0FBMkI7UUFDcEQsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtRQUNSLEVBQUUsRUFBRSxJQUFJO1FBQ1IsRUFBRSxFQUFFLElBQUk7UUFDUixFQUFFLEVBQUUsSUFBSTtLQUNSLENBQUM7SUFHRixTQUFTLGlCQUFpQixDQUFHLE9BQWUsRUFBRSxPQUFnQixFQUFFLFVBQW1CLElBQUk7UUFFdEYsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLElBQUssT0FBTyxFQUNaO1lBQ0MsYUFBYSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFFLENBQUM7U0FDdkU7UUFDRCx1QkFBdUIsQ0FBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FB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