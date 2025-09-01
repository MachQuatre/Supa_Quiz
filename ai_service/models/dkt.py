import torch
import torch.nn as nn

class DKT(nn.Module):
    """
    Deep Knowledge Tracing (DKT) via LSTM.
    Input:  one-hot concat (skill_correct, skill_incorrect) of size 2*K
            shape [B, T, 2K]
    Output: per time step, predicted P(correct) for each skill (size K)
            shape [B, T, K]
    """
    def __init__(self, num_skills: int, hidden_size: int = 128, dropout: float = 0.1):
        super().__init__()
        self.num_skills = num_skills
        self.input_size = 2 * num_skills
        self.lstm = nn.LSTM(self.input_size, hidden_size, batch_first=True)
        self.drop = nn.Dropout(dropout)
        self.out = nn.Linear(hidden_size, num_skills)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x, lengths=None):
        # x: [B, T, 2K]
        packed_out, _ = self.lstm(x)  # [B, T, H]
        h = self.drop(packed_out)
        y = self.out(h)               # [B, T, K]
        return self.sigmoid(y)        # probabilities
