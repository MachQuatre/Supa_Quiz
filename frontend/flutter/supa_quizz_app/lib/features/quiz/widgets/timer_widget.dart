import 'dart:async';
import 'package:flutter/material.dart';

class TimerWidget extends StatefulWidget {
  final VoidCallback onTimeUp;
  final int keyTrigger; // Ajout d'un déclencheur pour forcer le reset

  TimerWidget({required this.onTimeUp, required this.keyTrigger});

  @override
  _TimerWidgetState createState() => _TimerWidgetState();
}

class _TimerWidgetState extends State<TimerWidget> {
  int _secondsRemaining = 10;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant TimerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.keyTrigger != oldWidget.keyTrigger) {
      _resetTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          if (_secondsRemaining > 0) {
            _secondsRemaining--;
          } else {
            _timer?.cancel();
            widget.onTimeUp();
          }
        });
      }
    });
  }

  void _resetTimer() {
    setState(() {
      _secondsRemaining = 10;
    });
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      "Temps restant : $_secondsRemaining sec",
      style: TextStyle(
          fontSize: 18, fontWeight: FontWeight.bold, color: Colors.red),
    );
  }
}
