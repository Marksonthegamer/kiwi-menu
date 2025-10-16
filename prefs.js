import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const TEXT_DECODER = new TextDecoder();
const SOURCE_DIR = Gio.File.new_for_uri(import.meta.url).get_parent();

const ICONS = Object.freeze(
  loadIconsMetadata().map((icon) => Object.freeze(icon))
);

function loadIconsMetadata() {
  const filePath = GLib.build_filenamev([
    SOURCE_DIR?.get_path() ?? '.',
    'src',
    'icons.json',
  ]);

  try {
    const file = Gio.File.new_for_path(filePath);
    const [, contents] = file.load_contents(null);
    const data = JSON.parse(TEXT_DECODER.decode(contents));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logError(error, `Failed to load icons metadata from ${filePath}`);
    return [];
  }
}

const GeneralPage = GObject.registerClass(
  class GeneralPage extends Adw.PreferencesPage {
    constructor(settings) {
      super({
        title: 'Settings',
        icon_name: 'preferences-system-symbolic',
        name: 'GeneralPage',
      });

      this._settings = settings;

      const tweaksGroup = new Adw.PreferencesGroup({
        title: 'Tweaks',
      });

      const iconsList = new Gtk.StringList();
      ICONS.forEach((icon) => iconsList.append(icon.title));

      const iconSelectorRow = new Adw.ComboRow({
        title: 'Menu Icon',
        subtitle: 'Change the menu icon',
        model: iconsList,
        selected: this._settings.get_int('icon'),
      });

      const activityMenuSwitch = new Gtk.Switch({
        valign: Gtk.Align.CENTER,
        active: !this._settings.get_boolean('activity-menu-visibility'),
      });

      const activityMenuRow = new Adw.ActionRow({
        title: 'Hide Activities Menu',
        subtitle: 'Toggle to hide the Activities menu button',
        activatable_widget: activityMenuSwitch,
      });
      activityMenuRow.add_suffix(activityMenuSwitch);

      tweaksGroup.add(iconSelectorRow);
      tweaksGroup.add(activityMenuRow);

      this.add(tweaksGroup);

      iconSelectorRow.connect('notify::selected', (widget) => {
        this._settings.set_int('icon', widget.selected);
      });

      activityMenuSwitch.connect('notify::active', (widget) => {
        this._settings.set_boolean('activity-menu-visibility', !widget.get_active());
      });
    }
  }
);

export default class MaccyMenuPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const generalPage = new GeneralPage(settings);

    const prefsWidth = settings.get_int('prefs-default-width');
    const prefsHeight = settings.get_int('prefs-default-height');

    window.set_default_size(prefsWidth, prefsHeight);
    window.set_search_enabled(true);

    window.add(generalPage);

    window.connect('close-request', () => {
      const { default_width: currentWidth, default_height: currentHeight } = window;

      if (currentWidth !== prefsWidth || currentHeight !== prefsHeight) {
        settings.set_int('prefs-default-width', currentWidth);
        settings.set_int('prefs-default-height', currentHeight);
      }

      window.destroy();
    });
  }
}
