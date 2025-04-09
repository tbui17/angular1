import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'app-pagination',
  imports: [ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  control = input(new FormControl<number>(1, { nonNullable: true }));
  totalPages = input(1);
  onEnter = output<Event>();
  faArrowLeft = faArrowLeft;
  faArrowRight = faArrowRight;
  previous = output<MouseEvent>();
  previousDisabled = input(false);
  next = output<MouseEvent>();
  nextDisabled = input(false);
  inputBlur = output<Event>();
}
