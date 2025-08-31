import 'dart:async';
import 'package:flutter/material.dart';

class TimerWidget extends StatefulWidget {
  final VoidCallback onTimeUp;
  final int duration; // en secondes
  final int keyTrigger; // pour forcer le reset quand la question change
  final bool freeze;

  const TimerWidget({
    super.key,
    required this.onTimeUp,
    this.duration = 60,
    required this.keyTrigger,
    this.freeze = false,
  });

  @override
  State<TimerWidget> createState() => _TimerWidgetState();
}

class _TimerWidgetState extends State<TimerWidget> {
  late int _secondsRemaining;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant TimerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.keyTrigger != widget.keyTrigger) {
      _startTimer(); // redémarre si la question change
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _secondsRemaining = widget.duration;

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || widget.freeze) return; // ❗ Stoppe si gelé

      if (_secondsRemaining == 0) {
        timer.cancel();
        widget.onTimeUp();
      } else {
        setState(() => _secondsRemaining--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    double progress = _secondsRemaining / widget.duration;

    return Column(
      children: [
        const Text(
          "Temps restant",
          style: TextStyle(fontSize: 16),
        ),
        const SizedBox(height: 4),
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              height: 70,
              width: 70,
              child: CircularProgressIndicator(
                value: progress,
                backgroundColor: Colors.grey.shade300,
                valueColor: AlwaysStoppedAnimation<Color>(
                  _secondsRemaining <= 10 ? Colors.red : Colors.blue,
                ),
                strokeWidth: 6,
              ),
            ),
            Text(
              '$_secondsRemaining s',
              style: const TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: Colors.red),
            ),
          ],
        ),
      ],
    );
  }
}
