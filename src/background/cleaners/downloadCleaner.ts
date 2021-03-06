/**
 * License: zlib/libpng
 * @author Santo Pfingsten
 * @see https://github.com/Lusito/forget-me-not
 */

import { settings } from "../../lib/settings";
import { browser, Downloads, BrowsingData } from "webextension-polyfill-ts";
import { Cleaner } from "./cleaner";
import { getValidHostname } from "../../shared";
import { TabWatcher } from "../tabWatcher";

export class DownloadCleaner extends Cleaner {
    private readonly tabWatcher: TabWatcher;

    public constructor(tabWatcher: TabWatcher) {
        super();
        this.tabWatcher = tabWatcher;
        browser.downloads.onCreated.addListener(this.onCreated.bind(this));
    }

    private onCreated({ url, incognito }: Downloads.DownloadItem) {
        const domain = getValidHostname(url);
        if (domain) {
            if (settings.get("instantly.enabled") && settings.get("instantly.downloads")) {
                const applyRules = settings.get("instantly.downloads.applyRules");
                if (!applyRules || settings.isDomainBlocked(domain)) {
                    this.cleanupUrl(url);
                    return;
                }
            }
            if (!incognito && settings.get("startup.enabled") && settings.get("startup.downloads") && !settings.isDomainProtected(domain, false)) {
                const downloadsToClean = { ...settings.get("downloadsToClean") };
                downloadsToClean[url] = true;
                settings.set("downloadsToClean", downloadsToClean);
                settings.save();
            }
        }
    }

    private cleanupUrl(url: string) {
        browser.downloads.erase({ url });
        // Firefox Android doesn't support history API yet
        browser.history && browser.history.deleteUrl({ url });
    }

    public clean(typeSet: BrowsingData.DataTypeSet, startup: boolean) {
        const applyRules = settings.get(startup ? "startup.downloads.applyRules" : "cleanAll.downloads.applyRules");
        if (typeSet.downloads && (applyRules || !typeSet.history)) {
            // Need to manually clear downloads from history before cleaning downloads, as otherwise the history entries will remain on firefox.
            // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1380445
            typeSet.downloads = false;
            browser.downloads.search({}).then((downloads) => {
                const protectOpenDomains = startup || settings.get("cleanAll.protectOpenDomains");
                const urlsToClean = this.getUrlsToClean(downloads, startup, protectOpenDomains, applyRules);
                urlsToClean.forEach(this.cleanupUrl.bind(this));
            });
        }
    }

    private isDomainProtected(domain: string, ignoreStartupType: boolean, protectOpenDomains: boolean): boolean {
        if (protectOpenDomains && this.tabWatcher.containsDomain(domain))
            return true;
        return settings.isDomainProtected(domain, ignoreStartupType);
    }

    private getUrlsToClean(downloads: Downloads.DownloadItem[], startup: boolean, protectOpenDomains: boolean, applyRules: boolean): string[] {
        const downloadsToClean = { ...settings.get("downloadsToClean") };
        downloads.forEach((d) => downloadsToClean[d.url] = true);

        const newDownloadsToClean: { [s: string]: boolean } = {};
        let urls = Object.getOwnPropertyNames(downloadsToClean);
        if (applyRules) {
            urls = urls.filter((url) => {
                const isProtected = this.isDomainProtected(getValidHostname(url), startup, protectOpenDomains);
                if (isProtected)
                    newDownloadsToClean[url] = true;
                return !isProtected;
            });
        }

        settings.set("downloadsToClean", newDownloadsToClean);
        settings.save();
        return urls;
    }
}
