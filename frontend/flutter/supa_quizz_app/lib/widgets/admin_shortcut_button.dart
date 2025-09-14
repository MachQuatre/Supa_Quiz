import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AdminShortcutButton extends StatelessWidget {
  const AdminShortcutButton({super.key, this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final uri = Uri.parse('/admin'); // même domaine, servi par Nginx
    final onTap = () => launchUrl(
          uri,
          mode: LaunchMode.platformDefault,
          webOnlyWindowName: '_self', // ouvre dans le même onglet en Web
        );

    return compact
        ? IconButton(
            tooltip: 'Interface Admin',
            onPressed: onTap,
            icon: const Icon(Icons.settings_suggest_rounded),
          )
        : FilledButton.icon(
            onPressed: onTap,
            icon: const Icon(Icons.settings_suggest_rounded),
            label: const Text('Interface Admin'),
          );
  }
}
