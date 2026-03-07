import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {AiDifficultyRoutingModule} from './ai-difficulty-routing.module';
import {AiDifficultyPageComponent} from './pages/ai-difficulty-page/ai-difficulty-page.component';

@NgModule({
  imports: [CommonModule, RouterModule, AiDifficultyRoutingModule, AiDifficultyPageComponent],
})
export class AiDifficultyModule {}
