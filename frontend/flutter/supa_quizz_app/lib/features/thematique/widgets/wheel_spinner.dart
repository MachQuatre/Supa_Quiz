import 'package:flutter/material.dart';
import '../../../core/models/theme_model.dart';

class WheelSpinner extends StatefulWidget {
  final List<ThemeModel> themes;
  final void Function(ThemeModel) onConfirm;
  const WheelSpinner(
      {super.key, required this.themes, required this.onConfirm});

  @override
  State<WheelSpinner> createState() => _WheelSpinnerState();
}

class _WheelSpinnerState extends State<WheelSpinner> {
  int _current = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.themes.isEmpty) {
      return const Center(child: Text('Aucun thème disponible'));
    }
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          height: 240,
          child: ListWheelScrollView.useDelegate(
            itemExtent: 56,
            physics: const FixedExtentScrollPhysics(),
            onSelectedItemChanged: (i) => setState(() => _current = i),
            childDelegate: ListWheelChildBuilderDelegate(
              builder: (context, index) {
                final t = widget.themes[index];
                final selected = index == _current;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected
                        ? Colors.blue.withOpacity(0.1)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      t.name,
                      style: TextStyle(
                        fontSize: selected ? 20 : 16,
                        fontWeight:
                            selected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              },
              childCount: widget.themes.length,
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => widget.onConfirm(widget.themes[_current]),
          icon: const Icon(Icons.play_arrow),
          label: const Text('Choisir ce thème'),
        )
      ],
    );
  }
}
