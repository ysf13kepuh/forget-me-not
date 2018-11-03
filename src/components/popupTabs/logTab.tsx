import { h } from "tsx-dom";
import { SettingsCheckbox } from "../settingsCheckbox";
import { SettingsNumber } from "../settingsNumber";
import { messageUtil } from "../../lib/messageUtil";
import { CookieDomainInfo } from "../../shared";
import { removeAllChildren } from "../../lib/htmlUtils";
import { wetLayer } from "wet-layer";
import * as punycode from "punycode";
import "./style.scss";
import { isValidExpression, settings } from "../../lib/settings";
import { RuleType } from "../../lib/settingsSignature";
import { RuleDialog } from "../dialogs/ruleDialog";
import { getDomain } from "tldjs";

export function LogTab() {
    const list = <ul id="recently_accessed_domains" />;

    function appendPunycode(domain: string) {
        const punified = punycode.toUnicode(domain);
        return (punified === domain) ? domain : `${domain} (${punified})`;
    }
    function createListItem(info: CookieDomainInfo) {
        function addRule() {
            const expression = "*." + (getDomain(info.domain) || info.domain);
            if (isValidExpression(expression)) {
                function onConfirm(type: RuleType | false, expression?: string) {
                    if (expression && type !== false)
                        settings.setRule(expression, type);
                }
                let focusRule = settings.getExactRuleType(expression);
                if (focusRule === null)
                    focusRule = RuleType.WHITE;
                <RuleDialog expression={expression} editable={true} focusRule={focusRule} onConfirm={onConfirm} />;
            }
        }
        const punified = appendPunycode(info.domain);
        const addRuleMessage = wetLayer.getMessage("button_log_add_rule");
        const title = wetLayer.getMessage(info.badge.replace("badge_", "setting_type_") + "@title");
        return <li>
            <span class={info.badge} title={title}>{wetLayer.getMessage(info.badge)}</span>
            <span title={punified}>{punified}</span>
            <button class="log_add_rule" tabIndex={0} aria-label={`${addRuleMessage} (${punified})`} onClick={addRule}>{addRuleMessage}</button>
        </li>;
    }
    messageUtil.receive("onRecentlyAccessedDomains", (domains: CookieDomainInfo[]) => {
        removeAllChildren(list);
        for (const info of domains)
            list.appendChild(createListItem(info));
    });

    messageUtil.send("getRecentlyAccessedDomains");
    wetLayer.addListener(() => messageUtil.send("getRecentlyAccessedDomains"));

    return <div>
        <div class="split_equal">
            <SettingsCheckbox key="logRAD.enabled" i18n="setting_log_rad_enabled" />
            <SettingsNumber key="logRAD.limit" i18n="setting_log_rad_limit" class="align_right" />
        </div>
        <b data-i18n="recently_accessed_domains" class="top_margin" />
        {list}
    </div>;
}
